import Link from "next/link";
import { Database, UploadCloud, ArrowRight } from "lucide-react";

// Shown on every data page when no dataset is active yet (no scan / upload / import).
export function EmptyState({ title }: { title: string }) {
  return (
    <div className="space-y-5 py-2">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-slate-500">Reconciling usage against billing across your customer base.</p>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-10 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-indigo-500/15 text-indigo-300">
          <Database size={20} />
        </div>
        <h2 className="font-display text-lg font-semibold">No data loaded yet</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
          Connect a source, run a live scan, or upload a CSV/PDF to detect revenue
          leaking between usage and billing.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <Link
            href="/data-sources"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 transition"
          >
            <UploadCloud size={15} /> Go to Data Sources <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
