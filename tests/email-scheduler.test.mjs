import assert from "node:assert/strict";
import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { NextResponse } from "next/server.js";
import ts from "typescript";

// Exercise the actual route without importing production database/SMTP modules.
const route = ts.transpileModule(
  readFileSync(new URL("../src/app/api/cron/email-scheduler/route.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function setup(environment) {
  const calls = [];
  const comparisons = [];
  const record = (name, value) => async () => { calls.push(name); return value; };
  const modules = {
    "next/server": { NextResponse },
    "node:crypto": {
      createHash,
      timingSafeEqual: (a, b) => {
        comparisons.push([a.length, b.length]);
        return timingSafeEqual(a, b);
      },
    },
    "@/lib/email/schedules": {
      getDueSchedules: record("getDueSchedules", [{ id: 1, name: "Test", last_sent_at: null }]),
      logEmail: record("logEmail"),
      markScheduleSent: record("markScheduleSent"),
    },
    "@/lib/email/subscribers": {
      getActiveSubscribersForSchedule: record("getActiveSubscribersForSchedule", [
        { email: "test@example.invalid", unsubscribe_token: "test-unsubscribe" },
      ]),
    },
    "@/lib/email/report-data": {
      buildReport: record("buildReport", { totals: { inspections_since: 1, pushes_since: 1 } }),
    },
    "@/lib/email/render": { renderReportEmail: record("renderReportEmail", { html: "test", text: "test" }) },
    "@/lib/email/sender": { sendEmail: record("sendEmail") },
  };
  const exports = {};
  runInNewContext(route, {
    exports,
    process: { env: { ...environment } },
    require: name => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
      return modules[name];
    },
  });
  return { GET: exports.GET, calls, comparisons };
}

function request(authorization) {
  return new Request("https://dashboard.example.invalid/api/cron/email-scheduler", {
    headers: authorization === undefined ? {} : { authorization },
  });
}

for (const secret of [undefined, "", " \t "]) {
  test(`production fails closed for ${JSON.stringify(secret)} secret, even with an Authorization header`, async () => {
    for (const auth of [undefined, "Bearer undefined", "Bearer attacker"]) {
      const route = setup({ NODE_ENV: "production", CRON_SECRET: secret });
      const response = await route.GET(request(auth));
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: "cron_not_configured" });
      assert.deepEqual(route.calls, []);
    }
  });
}

test("unset and test environments do not bypass missing configuration", async () => {
  for (const env of [undefined, "test"]) {
    const route = setup({ NODE_ENV: env });
    assert.equal((await route.GET(request())).status, 503);
    assert.deepEqual(route.calls, []);
  }
});

test("invalid Authorization is rejected before any mailjob work in every environment", async () => {
  for (const env of ["production", "development"]) {
    for (const auth of [undefined, "", "Bearer wrong", "Bearer test-secreu", "Basic test-secret",
      "test-secret", "Bearer  test-secret", "Bearer test-secret-suffix", `Bearer ${"a".repeat(4096)}`,
      "Bearer tést-secret", "Bearer test-secret, Bearer test-secret"]) {
      const route = setup({ NODE_ENV: env, CRON_SECRET: "test-secret" });
      const response = await route.GET(request(auth));
      assert.equal(response.status, 401, `${env}: ${auth}`);
      assert.deepEqual(await response.json(), { error: "unauthorized" });
      assert.deepEqual(route.calls, []);
      assert.deepEqual(route.comparisons, [[32, 32]]);
    }
  }
});

test("valid production authentication executes the mocked mailjob normally", async () => {
  const route = setup({ NODE_ENV: "production", CRON_SECRET: "test-secret" });
  const response = await route.GET(request("Bearer test-secret"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    checked: 1, results: [{ id: 1, status: "sent", sent: 1, failed: 0 }],
  });
  assert.deepEqual(route.comparisons, [[32, 32]]);
  assert.deepEqual(route.calls, ["getDueSchedules", "getActiveSubscribersForSchedule", "buildReport",
    "renderReportEmail", "sendEmail", "logEmail", "markScheduleSent"]);
});

test("only explicit development retains the secret-free local workflow", async () => {
  const route = setup({ NODE_ENV: "development" });
  assert.equal((await route.GET(request())).status, 200);
  assert.ok(route.calls.includes("sendEmail"));
});
