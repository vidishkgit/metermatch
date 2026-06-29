"use client";

import { useActiveScan } from "@/lib/dataset";
import { usd2, severityStyle } from "@/lib/format";
import type { ScanResult, Severity } from "@/lib/engine";
import { CheckCircle2 } from "lucide-react";

export function AccountsView({ serverScan }: { serverScan: ScanResult }) {
  const { scan } = useActiveScan(serverScan);
  const { findings, summary } = scan;

  type Row = { name: string; total: number; count: number; worst: Severity };
  const byAccount = new Map<string, Row>();
  const order: Severity[] = ["low", "medium", "high", "critical"];
  for (const f of findings) {
    const cur: Row = byAccount.get(f.accountId) ?? { name: f.accountName, total: 0, count: 0, worst: "low" };
    cur.total += f.annualRecoverable;
    cur.count += 1;
    if (order.indexOf(f.severity) > order.indexOf(cur.worst)) cur.worst = f.severity;
    byAccount.set(f.accountId, cur);
  }
  const rows: Row[] = Array.from(byAccount.values()).sort((a, b) => b.total - a.total);
  const healthy = summary.accountsScanned - summary.accountsLeaking;

  return (
    <div className="space-y-5 py-2">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Accounts</h1>
        <p className="text-sm text-slate-500">
          {summary.accountsScanned} audited · <span className="text-rose-300">{summary.accountsLeaking} leaking</span> ·{" "}
          <span className="text-accent-emerald">{healthy} healthy</span>
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] tracking-wider text-slate-400 border-b border-white/[0.06]">
              <th className="px-5 py-3 font-medium">ACCOUNT</th>
              <th className="px-5 py-3 font-medium text-center">FINDINGS</th>
              <th className="px-5 py-3 font-medium">WORST SEVERITY</th>
              <th className="px-5 py-3 font-medium text-right">RECOVERABLE / YR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = severityStyle[r.worst];
              return (
                <tr key={r.name} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition">
                  <td className="px-5 py-3.5 text-white">{r.name}</td>
                  <td className="px-5 py-3.5 text-center tabular text-slate-300">{r.count}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${s.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right tabular font-semibold text-accent-emerald">{usd2(r.total)}</td>
                </tr>
              );
            })}
            <tr className="hover:bg-white/[0.02]">
              <td className="px-5 py-3.5 text-slate-400 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-accent-emerald" /> {healthy} healthy accounts
              </td>
              <td className="px-5 py-3.5 text-center tabular text-slate-600">0</td>
              <td className="px-5 py-3.5 text-slate-600 text-xs">No leakage detected</td>
              <td className="px-5 py-3.5 text-right tabular text-slate-600">$0.00</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
