import { NextResponse } from "next/server";
import { createSchedule, listSchedules } from "@/lib/email/schedules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const schedules = await listSchedules();
  return NextResponse.json({ schedules });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const time_of_day = typeof b.time_of_day === "string" ? b.time_of_day : "";
  const days = Array.isArray(b.days_of_week) ? b.days_of_week : [];
  const enabled = typeof b.enabled === "boolean" ? b.enabled : true;

  if (!name) return NextResponse.json({ error: "name verplicht" }, { status: 400 });
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time_of_day)) {
    return NextResponse.json({ error: "time_of_day moet HH:MM zijn" }, { status: 400 });
  }
  const days_of_week = days
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7);
  if (days_of_week.length === 0) {
    return NextResponse.json({ error: "minimaal 1 dag selecteren" }, { status: 400 });
  }

  const schedule = await createSchedule({ name, time_of_day, days_of_week, enabled });
  return NextResponse.json({ schedule }, { status: 201 });
}
