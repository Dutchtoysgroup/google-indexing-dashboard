import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { parseUrlsFromText, scheduleUrls } from "@/lib/priority";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseXlsxBuffer(buf: ArrayBuffer): string[] {
  const wb = XLSX.read(buf, { type: "array" });
  const urls: string[] = [];
  const seen = new Set<string>();
  const URL_RE = /https?:\/\/[^\s,;"']+/gi;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
    for (const row of rows) {
      for (const cell of row) {
        if (cell === null || cell === undefined) continue;
        const text = String(cell);
        const matches = text.match(URL_RE) ?? [];
        for (const raw of matches) {
          const url = raw.replace(/[.,;:]+$/, "").trim();
          if (url && !seen.has(url)) {
            seen.add(url);
            urls.push(url);
          }
        }
      }
    }
  }
  return urls;
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    const collected: string[] = [];
    let source = "dashboard";

    if (contentType.includes("application/json")) {
      const body = (await req.json()) as { text?: string; source?: string };
      if (body.text) collected.push(...parseUrlsFromText(body.text));
      if (body.source) source = body.source;
    } else if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const text = form.get("text");
      if (typeof text === "string" && text.trim()) {
        collected.push(...parseUrlsFromText(text));
      }
      const sourceField = form.get("source");
      if (typeof sourceField === "string" && sourceField.trim()) {
        source = sourceField.trim();
      }
      const file = form.get("file");
      if (file && typeof file !== "string") {
        const name = (file as File).name.toLowerCase();
        if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
          const buf = await (file as File).arrayBuffer();
          collected.push(...parseXlsxBuffer(buf));
        } else {
          const buf = await (file as File).text();
          collected.push(...parseUrlsFromText(buf));
        }
      }
    } else {
      const text = await req.text();
      collected.push(...parseUrlsFromText(text));
    }

    if (collected.length === 0) {
      return NextResponse.json(
        { error: "Geen geldige URLs gevonden in de input." },
        { status: 400 },
      );
    }

    const result = await scheduleUrls(collected, source);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
