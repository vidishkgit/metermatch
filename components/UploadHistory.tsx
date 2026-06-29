"use client";

import { useHistory, useActiveDataset, activateDataset, removeFromHistory, type StoredDataset } from "@/lib/dataset";
import { runReconciliation } from "@/lib/engine";
import { usd2 } from "@/lib/format";
import { FileText, FileSpreadsheet, CreditCard, Database, Check, Eye, Trash2, History } from "lucide-react";

const kindMeta: Record<StoredDataset["kind"], { label: string; Icon: typeof FileText; color: string }> = {
  csv: { label: "CSV", Icon: FileSpreadsheet, color: "#34D399" },
  pdf: { label: "PDF", Icon: FileText, color: "#F87171" },
  stripe: { label: "Stripe", Icon: CreditCard, color: "#635BFF" },
  aws: { label: "Live scan", Icon: Database, color: "#8B5CF6" },
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function UploadHistory() {
  const history = useHistory();
  const active = useActiveDataset();

  if (history.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-6">
      <div className="flex items-center gap-2">
        <History size={16} className="text-slate-400" />
        <h2 className="font-display text-lg font-semibold">Uploaded data</h2>
      </div>
      <p className="text-sm text-slate-500 mt-0.5">
        Every file, scan and import you&apos;ve loaded — kept in one place. Click one to view it across the app.
      </p>

      <div className="mt-5 divide-y divide-white/[0.05]">
        {history.map((d) => {
          const meta = kindMeta[d.kind];
          const total = runReconciliation({ period: d.period, accounts: d.accounts }).summary.totalAnnualRecoverable;
          const isActive = active?.uploadedAt === d.uploadedAt;
          return (
            <div key={d.uploadedAt} className="flex items-center gap-3 py-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                style={{ background: `${meta.color}1f`, color: meta.color, border: `1px solid ${meta.color}40` }}
              >
                <meta.Icon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm text-white">{d.name}</p>
                  {isActive && (
                    <span className="inline-flex items-center gap-1 rounded border border-accent-emerald/25 bg-accent-emerald/10 px-1.5 py-0.5 text-[9px] font-medium text-accent-emerald">
                      <Check size={9} /> Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {meta.label} · {d.accounts.length} accounts · {usd2(total)}/yr · {timeAgo(d.uploadedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {!isActive && (
                  <button
                    onClick={() => activateDataset(d)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/[0.06] hover:border-white/20 transition"
                  >
                    <Eye size={12} /> View
                  </button>
                )}
                <button
                  onClick={() => removeFromHistory(d.uploadedAt)}
                  className="grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:text-rose-300 hover:bg-white/[0.06] transition"
                  title="Remove"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
