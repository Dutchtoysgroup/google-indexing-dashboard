import { NextResponse } from "next/server";
import { listAllSubscribers, subscribe, isValidEmail } from "@/lib/email/subscribers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const subscribers = await listAllSubscribers();
    return NextResponse.json({ subscribers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { email?: string };
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

  try {
    const result = await subscribe(email);
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
