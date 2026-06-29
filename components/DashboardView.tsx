"use client";

import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { LeakBreakdown } from "@/components/LeakBreakdown";
import { useActiveScan } from "@/lib/dataset";
import { usd, usd2, severityStyle } from "@/lib/format";
import type { ScanResult } from "@/lib/engine";
import { ScanLine, TrendingUp, AlertTriangle, Wallet, Activity, ArrowRight } from "lucide-react";

export function DashboardView({ serverScan }: { serverScan: ScanResult }) {
  const { scan } = useActiveScan(serverScan);
  const { summary, findings } = scan;

  const kpis = [
    { label: "Accounts Scanned", value: summary.accountsScanned.toLocaleString(), sub: `${summary.accountsLeaking} leaking`, icon: ScanLine, tone: "text-accent-violet" },
    { label: "Findings", value: summary.findingsCount.toString(), sub: "needs review", icon: Activity, tone: "text-orange-300" },
    { label: "Recoverable / month", value: usd(summary.totalMonthlyRecoverable), sub: "actionable now", icon: Wallet, tone: "text-accent-emerald" },
    { label: "% of ARR Leaking", value: `${summary.pctOfArrLeaking}%`, sub: "of billed revenue", icon: AlertTriangle, tone: "text-rose-300" },
  ];

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500">Reconciling usage against billing across your customer base.</p>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015] shadow-card p-8 animate-rise">
        <div className="absolute -right-16 -top-28 h-64 w-64 rounded-full bg-indigo-500/[0.07] blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-300">
              <TrendingUp size={13} className="text-accent-emerald" /> Live revenue recovery
            </span>
          </div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">TOTAL RECOVERABLE / YEAR</p>
          <CountUp
            value={summary.totalAnnualRecoverable}
            className="font-display text-white text-6xl md:text-7xl font-bold mt-2 block tabular"
          />
          <p className="mt-4 text-sm text-slate-400">
            Across <span className="text-white font-medium">{summary.findingsCount} findings</span> in{" "}
            <span className="text-white font-medium">{summary.accountsScanned.toLocaleString()} accounts</span> ·{" "}
            <span className="text-accent-emerald">{summary.pctOfArrLeaking}% of billed ARR</span>
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, sub, icon: Icon, tone }) => (
          <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5 transition hover:border-white/15 hover:bg-white/[0.03]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">{label.toUpperCase()}</span>
              <span className={`grid place-items-center h-8 w-8 rounded-lg bg-white/[0.04] ${tone}`}>
                <Icon size={15} />
              </span>
            </div>
            <p className="font-display text-3xl font-semibold tabular">{value}</p>
            <p className={`text-xs mt-1 ${tone}`}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Breakdown */}
        <div className="lg:col-span-3 rounded-xl border border-white/[0.07] bg-white/[0.015] p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-display text-lg font-semibold">Recoverable by Leakage Type</h2>
              <p className="text-xs text-slate-500">Where revenue is slipping through the meter</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 tracking-wider">TOTAL</p>
              <p className="font-display text-xl font-semibold tabular">{usd(summary.totalAnnualRecoverable)}</p>
            </div>
          </div>
          <LeakBreakdown data={summary.byType} />
        </div>

        {/* Top findings */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.07] bg-white/[0.015] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Top Findings</h2>
            <Link href="/findings" className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {findings.length === 0 && (
              <p className="text-sm text-slate-500 py-6 text-center">No findings to show.</p>
            )}
            {findings.slice(0, 5).map((f) => {
              const s = severityStyle[f.severity];
              return (
                <div key={f.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.05] p-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{f.accountName}</p>
                    <p className="text-xs text-slate-500 truncate">{f.title}</p>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    <p className="text-sm font-semibold tabular text-accent-emerald">{usd2(f.annualRecoverable)}</p>
                    <span className={`inline-block mt-1 rounded-full border px-2 py-0.5 text-[10px] ${s.cls}`}>{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
