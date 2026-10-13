import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { runEmailScheduler } from "@/lib/email/deliveries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(req: Request) {
  // De scheduler stuurt Authorization: Bearer ${CRON_SECRET}.
  // Alleen expliciete development mag zonder secret werken. Elke andere
  // omgeving faalt gesloten vóór databasequeries of mailverwerking.
  const expected = process.env.CRON_SECRET;
  if (!expected?.trim()) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "cron_not_configured" }, { status: 503 });
    }
  } else {
    // Vaste digestlengtes voorkomen een lengtefout of vroege tokenvergelijking.
    const suppliedHash = createHash("sha256")
      .update(req.headers.get("authorization") ?? "")
      .digest();
    const expectedHash = createHash("sha256").update(`Bearer ${expected}`).digest();
    if (!timingSafeEqual(suppliedHash, expectedHash)) return unauthorized();
  }

  return NextResponse.json(await runEmailScheduler());
}
