"use client";

import Link from "next/link";
import { useActiveScan } from "@/lib/dataset";
import { emptyScan } from "@/lib/format";
import { FileText, X, UploadCloud } from "lucide-react";

// Shown across every page while an uploaded dataset is driving the app.
export function DatasetBanner() {
  // serverScan is irrelevant here; we only care whether an override is active.
  const { dataset, clear } = useActiveScan(emptyScan);
  if (!dataset) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-indigo-400/20 bg-indigo-500/[0.08] px-4 md:px-8 py-2.5 text-sm">
      <div className="flex items-center gap-2 text-indigo-100 min-w-0">
        <FileText size={15} className="shrink-0 text-indigo-300" />
        <span className="truncate">
          Viewing uploaded data ·{" "}
          <span className="font-medium text-white">{dataset.name}</span>{" "}
          <span className="text-indigo-200/80">
            ({dataset.accounts.length} account{dataset.accounts.length === 1 ? "" : "s"})
          </span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/data-sources"
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1 text-xs text-indigo-100 hover:bg-white/10 transition"
        >
          <UploadCloud size={13} /> Upload new data
        </Link>
        <button
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1 text-xs text-indigo-100 hover:bg-white/10 transition"
        >
          <X size={13} /> Clear
        </button>
      </div>
    </div>
  );
}
