"use client";

// Best-effort PDF → accounts extraction.
//
// PDFs have no reliable table structure, so the dependable path is: a PDF that
// embeds the same comma-separated columns as the CSV template (e.g. a data export
// rendered to PDF). We reconstruct text lines by their vertical position, locate
// the columns header, and hand the rebuilt CSV to the existing CSV parser so all
// validation/typing is shared. Arbitrary vendor invoices won't map cleanly —
// callers should steer users to CSV for accuracy.

import { parseAccountsCsv, type ParseResult } from "./csv";

const PDFJS_VERSION = "4.6.82";

export interface PdfParseResult extends ParseResult {
  rawText: string;
}

export async function parsePdfToAccounts(file: File): Promise<PdfParseResult> {
  const pdfjs: typeof import("pdfjs-dist") = await import("pdfjs-dist");
  // Worker from jsDelivr (serves the .mjs module worker with correct MIME + CORS;
  // unpkg frequently fails on module workers).
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;

  const lines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    // Group text items into lines by rounded y, then order each line left→right.
    const byY = new Map<number, { x: number; s: string }[]>();
    for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
      const s = item.str ?? "";
      if (!s.trim() || !item.transform) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      (byY.get(y) ?? byY.set(y, []).get(y)!).push({ x, s });
    }
    for (const y of [...byY.keys()].sort((a, b) => b - a)) {
      const parts = byY.get(y)!.sort((a, b) => a.x - b.x).map((p) => p.s);
      lines.push(parts.join("").trim());
    }
  }

  const rawText = lines.join("\n");
  const csv = extractCsvBlock(lines);
  if (!csv) {
    return {
      accounts: [],
      errors: [
        "Couldn't find a recognizable accounts table in this PDF. The PDF needs the same comma-separated columns as the CSV template (id, name, … usageCalls …). For reliable results, use CSV upload.",
      ],
      rowCount: 0,
      rawText,
    };
  }

  return { ...parseAccountsCsv(csv), rawText };
}

// Locate the header row (must look like our columns) and keep comma-bearing rows.
function extractCsvBlock(lines: string[]): string | null {
  const headerIdx = lines.findIndex(
    (l) => l.includes(",") && /\bid\b/i.test(l) && /name/i.test(l) && /usageCalls/i.test(l)
  );
  if (headerIdx === -1) return null;

  const block: string[] = [];
  for (let i = headerIdx; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l && l.includes(",")) block.push(l); // skip footers / page numbers
  }
  return block.length > 1 ? block.join("\n") : null;
}
