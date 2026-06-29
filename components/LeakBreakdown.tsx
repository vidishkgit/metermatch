"use client";

import { usd } from "@/lib/format";

const COLORS = ["#6366F1", "#8B5CF6", "#A855F7", "#2DD4BF", "#34D399", "#22D3EE"];

export function LeakBreakdown({ data }: { data: { title: string; amount: number }[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0) || 1;
  return (
    <div className="space-y-5">
      {/* Segmented "meter" bar — bespoke flow visualization */}
      <div className="flex h-3 w-full overflow-hidden rounded-full border border-white/10">
        {data.map((d, i) => (
          <div
            key={d.title}
            style={{ width: `${(d.amount / total) * 100}%`, background: COLORS[i % COLORS.length] }}
            className="h-full"
            title={`${d.title}: ${usd(d.amount)}`}
          />
        ))}
      </div>

      <div className="space-y-4">
        {data.map((d, i) => (
          <div key={d.title} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-slate-200">{d.title}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular font-medium text-white">{usd(d.amount)}</span>
                <span className="tabular text-xs text-slate-500 w-9 text-right">
                  {Math.round((d.amount / total) * 100)}%
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full"
                style={{ width: `${(d.amount / total) * 100}%`, background: COLORS[i % COLORS.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
