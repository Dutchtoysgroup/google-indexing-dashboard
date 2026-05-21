import { NextResponse } from "next/server";
import { deletePriorityUrl } from "@/lib/priority";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ error: "Ongeldig id" }, { status: 400 });
  }
  try {
    const ok = await deletePriorityUrl(numId);
    if (!ok) {
      return NextResponse.json(
        { error: "Niet gevonden of al gepusht" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
