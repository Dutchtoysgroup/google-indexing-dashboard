import { NextResponse } from "next/server";
import { dispatchWorkflow, getLatestRun } from "@/lib/github-trigger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await dispatchWorkflow();
    // GitHub doesn't return the new run id from /dispatches; it only queues.
    // Give Actions a moment and then fetch the latest run so the UI can link to it.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    let run = null;
    try {
      run = await getLatestRun();
    } catch {
      // Non-fatal: dispatch succeeded, just no link.
    }
    return NextResponse.json({ ok: true, dispatchedAt: result.dispatchedAt, run });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = msg.includes("GITHUB_PAT") ? 500 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function GET() {
  try {
    const run = await getLatestRun();
    return NextResponse.json({ run });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
