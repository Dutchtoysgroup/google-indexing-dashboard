import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction("fetch", "process", "console",
  readFileSync(new URL("../webjobs/email-scheduler/run.js", import.meta.url), "utf8"));
const environment = { env: { NEXT_PUBLIC_BASE_URL: "https://test.invalid", CRON_SECRET: "test-only" } };
const consoleStub = { log() {} };

test("WebJob surfaces failed and uncertain deliveries without exposing recipients", async () => {
  for (const result of [
    { id: 1, status: "partial", failed: 1, uncertain: 0 },
    { id: 2, status: "uncertain", failed: 0, uncertain: 1 },
    { id: 3, status: "failed", failed: 0, uncertain: 0, error: "database problem" },
  ]) {
    await assert.rejects(run(async () => Response.json({ results: [result] }), environment, consoleStub), /vereist aandacht/);
  }
});

test("WebJob accepts success and a schedule already owned by another worker", async () => {
  for (const status of ["sent", "skipped", "busy"]) {
    await run(async () => Response.json({ results: [{ id: 1, status, failed: 0, uncertain: 0 }] }), environment, consoleStub);
  }
});
