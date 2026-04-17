import { NextResponse } from "next/server";
import {
  listAllSubscribersWithSchedules,
  subscribe,
  isValidEmail,
} from "@/lib/email/subscribers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const subscribers = await listAllSubscribersWithSchedules();
    return NextResponse.json({ subscribers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { email?: string; scheduleIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ error: "Vul een e-mailadres in." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Geen geldig e-mailadres." }, { status: 400 });
  }

  let scheduleIds: number[] = [];
  if (Array.isArray(body.scheduleIds)) {
    scheduleIds = body.scheduleIds
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0);
  }
  if (scheduleIds.length === 0) {
    return NextResponse.json(
      { error: "Selecteer minimaal één schedule om op in te schrijven." },
      { status: 400 }
    );
  }

  try {
    const result = await subscribe(email, scheduleIds);
    return NextResponse.json({
      ok: true,
      email: result.subscriber.email,
      created: result.created,
      reactivated: result.reactivated,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
