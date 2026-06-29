"use client";

import { FinanceModel } from "@/components/FinanceModel";
import { LeakBreakdown } from "@/components/LeakBreakdown";
import { useActiveScan } from "@/lib/dataset";
import { usd, emptyScan } from "@/lib/format";
import { EmptyState } from "@/components/EmptyState";

export function FinanceView() {
  const { scan, dataset } = useActiveScan(emptyScan);
  if (!dataset) return <EmptyState title="Financial Impact" />;
  const { summary } = scan;

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Financial Impact</h1>
        <p className="text-sm text-slate-500">
          What recovered revenue is worth — flowed through the statements into enterprise value.
        </p>
      </div>

      <FinanceModel baselineArr={summary.annualBilled} recoveredArr={summary.totalAnnualRecoverable} />

      {/* Revenue streams */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-semibold">Recoverable revenue streams</h2>
            <p className="text-xs text-slate-500">The leakage categories feeding the model above</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 tracking-wider">CURRENT BILLED ARR</p>
            <p className="font-display text-xl font-semibold tabular">{usd(summary.annualBilled)}</p>
          </div>
        </div>
        <LeakBreakdown data={summary.byType} />
      </div>
    </div>
  );
}
