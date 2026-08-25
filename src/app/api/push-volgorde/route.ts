import { NextResponse } from "next/server";
import { getPriorityRows, savePriorityOrder } from "@/lib/push-priority";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getPriorityRows();
    return NextResponse.json({ rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as { order?: unknown };
    if (!Array.isArray(body.order)) {
      return NextResponse.json({ error: "Veld 'order' ontbreekt" }, { status: 400 });
    }
    await savePriorityOrder(body.order as string[]);
    const rows = await getPriorityRows();
    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
