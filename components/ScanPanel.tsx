"use client";

import { useState } from "react";
import Link from "next/link";
import { loadLiveAccounts } from "@/app/actions";
import { runReconciliation, type ScanResult } from "@/lib/engine";
import { writeDataset } from "@/lib/dataset";
import { CountUp } from "./CountUp";
import { usd } from "@/lib/format";
import { UploadCloud, Database, Play, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export function ScanPanel() {
  const [status, setStatus] = useState<"idle" | "scanning" | "done">("idle");
  const [result, setResult] = useState<ScanResult | null>(null);

  async function handleScan() {
    setStatus("scanning");
    setResult(null);
    // Let the scan animation play, then pull the live accounts and run the engine.
    await new Promise((r) => setTimeout(r, 1800));
    const { accounts, period } = await loadLiveAccounts();
    const res = runReconciliation({ period, accounts });
    // Store as the active dataset so the whole app reflects this scan.
    writeDataset({ accounts, name: "Live scan (DynamoDB + Aurora)", kind: "aws", period, uploadedAt: Date.now() });
    setResult(res);
    setStatus("done");
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-3">
        {[
          { icon: UploadCloud, title: "Usage events", sub: "Account, metric, quantity, timestamp", tag: "DynamoDB", tone: "#29B5E8" },
          { icon: UploadCloud, title: "Invoices & contracts", sub: "Plan, base, overage, discounts", tag: "Aurora", tone: "#8B5CF6" },
          { icon: Database, title: "Sample dataset", sub: "Built-in demo company, ready to scan", tag: "Loaded", tone: "#34D399" },
        ].map(({ icon: Icon, title, sub, tag, tone }) => (
          <div key={title} className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
            <div className="flex items-center justify-between mb-3">
              <span
                className="grid place-items-center h-9 w-9 rounded-lg"
                style={{ background: `${tone}1f`, color: tone, border: `1px solid ${tone}40` }}
              >
                <Icon size={15} />
              </span>
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-slate-400">{tag}</span>
            </div>
            <p className="text-sm font-medium text-white">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{sub}</p>
          </div>
        ))}
      </div>

      {/* Scan stage */}
      <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.015] p-8 min-h-[260px] grid place-items-center text-center">
        {status === "scanning" && (
          <div className="absolute left-0 top-0 h-16 w-full bg-gradient-to-b from-indigo-500/20 to-transparent animate-scanline" />
        )}

        {status === "idle" && (
          <div>
            <p className="text-slate-400 text-sm mb-5 max-w-sm mx-auto">
              Run a reconciliation scan to detect revenue leaking between usage and billing.
            </p>
            <button
              onClick={handleScan}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 transition"
            >
              <Play size={15} /> Run Scan
            </button>
          </div>
        )}

        {status === "scanning" && (
          <div className="relative z-10">
            <Loader2 className="mx-auto animate-spin text-indigo-400" size={26} />
            <p className="mt-4 font-display text-lg">Reconciling usage against billing…</p>
            <p className="text-xs text-slate-500 mt-1">Joining DynamoDB events with the Aurora ledger</p>
          </div>
        )}

        {status === "done" && result && (
          <div className="relative z-10 animate-rise">
            <div className="inline-flex items-center gap-1.5 rounded-md border border-accent-emerald/25 bg-accent-emerald/10 px-2.5 py-1 text-xs text-emerald-200 mb-4">
              <CheckCircle2 size={13} /> Scan complete
            </div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">RECOVERABLE / YEAR</p>
            <CountUp value={result.summary.totalAnnualRecoverable} className="font-display text-white text-5xl font-bold mt-1.5 block tabular" />
            <p className="text-sm text-slate-400 mt-3">
              {result.summary.findingsCount} findings · {usd(result.summary.totalMonthlyRecoverable)}/mo ·{" "}
              {result.summary.accountsScanned} accounts scanned
            </p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <Link href="/findings" className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 transition">
                Review findings <ArrowRight size={14} />
              </Link>
              <button onClick={handleScan} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] transition">
                Re-run
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
