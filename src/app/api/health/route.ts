import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getDb()`SELECT count(*)::int AS urls FROM urls`;
    return NextResponse.json({ status: "ok", database: "ok", urls: rows[0].urls });
  } catch {
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 });
  }
}
