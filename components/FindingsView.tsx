"use client";

import { FindingsTable } from "@/components/FindingsTable";
import { useActiveScan } from "@/lib/dataset";
import type { ScanResult } from "@/lib/engine";

export function FindingsView({ serverScan }: { serverScan: ScanResult }) {
  const { scan } = useActiveScan(serverScan);
  return (
    <div className="space-y-5 py-2">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Findings</h1>
        <p className="text-sm text-slate-500">Every detected leak, ranked by recoverable revenue.</p>
      </div>
      <FindingsTable findings={scan.findings} />
    </div>
  );
}
