import { NextResponse } from "next/server";
import { deleteSchedule, updateSchedule } from "@/lib/email/schedules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const patch: Parameters<typeof updateSchedule>[1] = {};
  if (typeof b.name === "string") patch.name = b.name.trim();
  if (typeof b.enabled === "boolean") patch.enabled = b.enabled;
  if (typeof b.time_of_day === "string") {
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(b.time_of_day)) {
      return NextResponse.json({ error: "time_of_day moet HH:MM zijn" }, { status: 400 });
    }
    patch.time_of_day = b.time_of_day;
  }
  if (Array.isArray(b.days_of_week)) {
    const days = b.days_of_week.map(Number).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
    if (days.length === 0) {
      return NextResponse.json({ error: "minimaal 1 dag selecteren" }, { status: 400 });
    }
    patch.days_of_week = days;
  }

  const schedule = await updateSchedule(id, patch);
  if (!schedule) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ schedule });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id: idStr } = await ctx.params;
  const id = parseId(idStr);
  if (!id) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const ok = await deleteSchedule(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
