import { NextResponse } from "next/server";
import {
  deleteSubscriber,
  updateSubscriberSchedules,
} from "@/lib/email/subscribers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numeric = Number.parseInt(id, 10);
  if (!Number.isFinite(numeric)) {
    return NextResponse.json({ error: "Ongeldig id" }, { status: 400 });
  }
  try {
    const ok = await deleteSubscriber(numeric);
    if (!ok) {
      return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numeric = Number.parseInt(id, 10);
  if (!Number.isFinite(numeric)) {
    return NextResponse.json({ error: "Ongeldig id" }, { status: 400 });
  }

  let body: { scheduleIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }

  if (!Array.isArray(body.scheduleIds)) {
    return NextResponse.json({ error: "scheduleIds ontbreekt of is geen array" }, { status: 400 });
  }
  const scheduleIds = body.scheduleIds
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v > 0);

  try {
    await updateSubscriberSchedules(numeric, scheduleIds);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
