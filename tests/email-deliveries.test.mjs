import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { userInfo } from "node:os";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { NextResponse } from "next/server.js";
import { createHash, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import ts from "typescript";

function load(file, modules) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { exports, Date, Error, process: { env: { NODE_ENV: "production", CRON_SECRET: "test-only" } },
    require: name => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; } });
  return exports;
}
const { runEmailScheduler } = load("../src/lib/email/deliveries.ts", {
  "@/lib/db": {}, "./report-data": {}, "./render": {}, "./sender": {},
});

// Opt-in only; a new disposable DB on the local Unix socket. Never reads .env,
// DATABASE_URL or PGHOST and never imports the production SMTP implementation.
test("delivery ledger on real PostgreSQL", { skip: process.env.INDEXING_TEST_DATABASE !== "1" }, async t => {
  const config = { host: "/tmp", port: 5432, user: userInfo().username };
  const admin = new Pool({ ...config, database: "postgres" });
  const database = `indexing_delivery_test_${process.pid}_${Date.now()}`;
  await admin.query(`CREATE DATABASE ${database}`);
  const pool = new Pool({ ...config, database, options: "-c search_path=app_indexing", max: 10 });
  try {
    await pool.query("CREATE SCHEMA app_indexing");
    for (const file of ["001_email_tables.sql", "002_email_subscribers.sql", "003_subscriber_schedules.sql"]) {
      await pool.query(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
    }
    // Exact central migration fixture except production-only role grants.
    const migration = readFileSync(new URL("./fixtures/V135__indexing_email_deliveries.sql", import.meta.url), "utf8");
    assert.equal(createHash("sha256").update(migration).digest("hex"), "e1ddc3220fa8efc8af4b98985366104649510db667db763404685d4060f5ecbd");
    await pool.query(migration.replace(/GRANT SELECT, INSERT, UPDATE, DELETE[\s\S]*$/, ""));
    const now = new Date("2026-10-13T08:00:00Z"); // Tuesday 10:00 Amsterdam
    async function fixture(send) {
      await pool.query("TRUNCATE email_schedules, email_subscribers, email_log RESTART IDENTITY CASCADE");
      await pool.query("INSERT INTO email_schedules (name,time_of_day,days_of_week) VALUES ('Daily','10:00',ARRAY[1,2,3,4,5,6,7])");
      await pool.query("INSERT INTO email_subscribers(email,unsubscribe_token) VALUES ('a@example.invalid','a-token'),('b@example.invalid','b-token')");
      await pool.query("INSERT INTO email_subscriber_schedules(subscriber_id,schedule_id) VALUES (1,1),(2,1)");
      const sent = [], reports = [], rendered = [];
      const deps = {
        pool,
        buildReport: async since => { reports.push(since); return { generatedAt: now.toISOString(), totals: { inspections_since: 1, pushes_since: 2 } }; },
        renderReportEmail: async input => { rendered.push(input); return { html: `report-${rendered.length}`, text: "saved content" }; },
        sendEmail: async input => { sent.push(input); if (send) await send(input); },
      };
      const run = (at = now) => runEmailScheduler(deps, at);
      const { GET } = load("../src/app/api/cron/email-scheduler/route.ts", {
        "next/server": { NextResponse }, "node:crypto": { createHash, timingSafeEqual },
        "@/lib/email/deliveries": { runEmailScheduler: run },
      });
      const request = () => GET(new Request("https://test.invalid/api/cron/email-scheduler", { headers: { authorization: "Bearer test-only" } }));
      return { deps, run, request, sent, reports, rendered };
    }
    const rows = async () => (await pool.query("SELECT recipient,status,attempts FROM email_deliveries ORDER BY recipient")).rows;
    const watermark = async () => (await pool.query("SELECT last_sent_at FROM email_schedules WHERE id=1")).rows[0].last_sent_at;

    await t.test("two concurrent authenticated cronrequests send each recipient only once", async () => {
      let started, unblock;
      const startedPromise = new Promise(resolve => { started = resolve; });
      const blocked = new Promise(resolve => { unblock = resolve; });
      const f = await fixture(async () => { started(); await blocked; });
      const first = f.request();
      await startedPromise;
      const second = await (await f.request()).json();
      assert.equal(second.results[0].status, "busy");
      unblock();
      assert.equal((await (await first).json()).results[0].sent, 2);
      await f.request();
      assert.deepEqual(f.sent.map(s => s.to), ["a@example.invalid", "b@example.invalid"]);
      assert.equal(f.reports.length, 1);
      assert.ok(await watermark());
    });

    await t.test("only the rejected recipient retries outside the original hour with identical content", async () => {
      let reject = true;
      const f = await fixture(async input => {
        if (input.to.startsWith("b@") && reject) throw Object.assign(new Error("SMTP unavailable"), { responseCode: 450, command: "DATA" });
      });
      assert.equal((await f.run()).results[0].status, "partial");
      assert.equal(await watermark(), null);
      assert.deepEqual((await rows()).map(r => r.status), ["sent", "failed"]);
      await f.run(); // bounded backoff, no immediate retry
      assert.equal(f.sent.length, 2);
      reject = false;
      await f.run(new Date("2026-10-13T14:00:00Z"));
      assert.equal(f.sent.length, 3);
      assert.deepEqual(f.sent[2], f.sent[1]);
      assert.equal(f.reports.length, 1);
      assert.equal(f.rendered.length, 2);
      assert.deepEqual((await rows()).map(r => r.attempts), [1, 2]);
      assert.equal((await watermark()).toISOString(), now.toISOString());
    });

    await t.test("new periods are independent of a failed older delivery", async () => {
      const f = await fixture(async input => {
        if (input.to.startsWith("b@")) throw Object.assign(new Error("Rejected"), { responseCode: 451 });
      });
      await f.run();
      await f.run(new Date("2026-10-14T08:00:00Z"));
      const runs = (await pool.query("SELECT * FROM email_runs")).rows;
      assert.equal(runs.length, 2);
      assert.equal(f.reports.length, 2);
      assert.equal(f.reports[1].toISOString(), now.toISOString());
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM email_deliveries WHERE status='failed'")).rows[0].n, 2);
      assert.equal(await watermark(), null);
    });

    await t.test("unsubscribe cancels just that recipient's queued retry", async () => {
      const f = await fixture(async input => {
        if (input.to.startsWith("b@")) throw Object.assign(new Error("Rejected"), { responseCode: 450 });
      });
      await f.run();
      await pool.query("UPDATE email_subscribers SET unsubscribed_at=now() WHERE id=2");
      await f.run(new Date("2026-10-13T14:00:00Z"));
      assert.equal(f.sent.length, 2);
      assert.deepEqual((await rows()).map(r => r.status), ["sent", "cancelled"]);
    });

    await t.test("ambiguous SMTP timeout never retries automatically", async () => {
      const f = await fixture(async input => {
        if (input.to.startsWith("b@")) throw Object.assign(new Error("Connection lost after DATA"), { code: "ETIMEDOUT", command: "DATA" });
      });
      assert.equal((await f.run()).results[0].uncertain, 1);
      await f.run(new Date("2026-10-13T14:00:00Z"));
      assert.equal(f.sent.length, 2);
      assert.equal(await watermark(), null);
      assert.deepEqual((await rows()).map(r => r.status), ["sent", "uncertain"]);
    });

    await t.test("failure to persist SMTP success leaves a durable claim, not a resend", async () => {
      const f = await fixture();
      await pool.query(`CREATE FUNCTION reject_email_log() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'simulated log failure'; END $$;
        CREATE TRIGGER reject_email_log BEFORE INSERT ON email_log FOR EACH ROW EXECUTE FUNCTION reject_email_log()`);
      try {
        assert.equal((await f.run()).results[0].status, "failed");
        assert.equal(f.sent.length, 1);
        assert.equal((await rows())[0].status, "sending");
      } finally {
        await pool.query("DROP TRIGGER reject_email_log ON email_log; DROP FUNCTION reject_email_log()");
      }
      const retry = await f.run(new Date("2026-10-13T14:00:00Z"));
      assert.equal(retry.results[0].uncertain, 1);
      assert.deepEqual(f.sent.map(s => s.to), ["a@example.invalid", "b@example.invalid"]);
      assert.equal((await rows())[0].status, "uncertain");
    });

    await t.test("lost lock connection during SMTP does not allow another worker to resend", async () => {
      let started, unblock;
      const startedPromise = new Promise(resolve => { started = resolve; });
      const blocked = new Promise(resolve => { unblock = resolve; });
      const f = await fixture(async input => {
        if (input.to.startsWith("a@")) { started(); await blocked; }
      });
      const first = f.run();
      await startedPromise;
      // Terminate only the disposable test DB's schedule lock owner.
      await pool.query(`SELECT pg_terminate_backend(pid) FROM pg_locks
        WHERE locktype='advisory' AND classid=20261013 AND objid=1
          AND database=(SELECT oid FROM pg_database WHERE datname=current_database())`);
      const second = await f.run();
      unblock();
      await first;
      assert.equal(second.results[0].uncertain, 1);
      assert.deepEqual(f.sent.map(s => s.to), ["a@example.invalid", "b@example.invalid"]);
      assert.equal((await rows())[0].status, "uncertain");
    });

    await t.test("an old failed delivery still retries when today's report cannot render", async () => {
      let reject = true;
      const f = await fixture(async input => {
        if (input.to.startsWith("b@") && reject) throw Object.assign(new Error("Rejected"), { responseCode: 450 });
      });
      await f.run();
      reject = false;
      f.deps.renderReportEmail = async () => { throw new Error("new report failed"); };
      const next = await f.run(new Date("2026-10-14T08:00:00Z"));
      assert.equal(next.results[0].status, "failed"); // reports preparation error
      assert.equal(next.results[0].sent, 1); // still delivered the older report
      assert.equal(f.sent.length, 3);
      assert.deepEqual((await rows()).map(r => r.status), ["sent", "sent"]);
    });

    await t.test("unique recipient-period key prevents a second delivery record", async () => {
      const f = await fixture(); await f.run();
      await assert.rejects(pool.query(`INSERT INTO email_deliveries
        (schedule_id, period, recipient, subject, html, plain_text)
        SELECT schedule_id, period, recipient, subject, html, plain_text FROM email_deliveries LIMIT 1`), { code: "23505" });
    });

    await t.test("render failure leaves no partial period or mail", async () => {
      const f = await fixture();
      f.deps.renderReportEmail = async () => { throw new Error("render failed"); };
      assert.equal((await f.run()).results[0].status, "failed");
      assert.equal(f.sent.length, 0);
      assert.equal((await pool.query("SELECT * FROM email_runs")).rowCount, 0);
    });

    await t.test("quarter-hourly WebJob sends every schedule once in both summer and winter time", async () => {
      await pool.query("TRUNCATE email_schedules, email_subscribers, email_log RESTART IDENTITY CASCADE");
      await pool.query(`INSERT INTO email_schedules (name,time_of_day,days_of_week)
        VALUES ('Acht','08:00',ARRAY[1,2,3,4,5,6,7]),('Halftien','09:30',ARRAY[1,2,3,4,5,6,7]),
          ('Tienvoornegen','08:50',ARRAY[1,2,3,4,5,6,7])`);
      await pool.query("INSERT INTO email_subscribers(email,unsubscribe_token) VALUES ('a@example.invalid','a-token')");
      await pool.query("INSERT INTO email_subscriber_schedules(subscriber_id,schedule_id) VALUES (1,1),(1,2),(1,3)");
      const local = new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit" });
      const sent = [];
      let current;
      const deps = {
        pool,
        buildReport: async () => ({ generatedAt: current.toISOString(), totals: { inspections_since: 0, pushes_since: 0 } }),
        renderReportEmail: async () => ({ html: "report", text: "report" }),
        sendEmail: async input => { sent.push({ schedule: input.subject.match(/\] (\S+) —/)[1], at: local.format(current) }); },
      };
      // Tuesday in CEST (UTC+2) and the Tuesday after the switch to CET (UTC+1).
      for (const day of ["2026-10-13", "2026-10-27"]) {
        sent.length = 0;
        for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
          current = new Date(Date.parse(`${day}T00:00:00Z`) + minutes * 60_000);
          await runEmailScheduler(deps, current);
        }
        // 08:50 is not on a quarter hour: it goes out at 09:00, within its hour.
        assert.deepEqual(sent, [{ schedule: "Acht", at: "08:00" }, { schedule: "Tienvoornegen", at: "09:00" },
          { schedule: "Halftien", at: "09:30" }], day);
      }
    });
  } finally {
    await pool.end();
    await admin.query(`DROP DATABASE ${database} WITH (FORCE)`);
    await admin.end();
  }
});
