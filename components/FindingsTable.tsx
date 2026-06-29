"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Finding, Severity } from "@/lib/engine";
import { usd2, severityStyle } from "@/lib/format";
import { findingsToCsv, downloadText } from "@/lib/csv";
import { exportFindingsPdf } from "@/lib/pdf";
import { X, ArrowUpDown, Search, Download, Check, RotateCcw, FileText } from "lucide-react";

const SEVERITIES: (Severity | "all")[] = ["all", "critical", "high", "medium", "low"];
const STORAGE_KEY = "metermatch:resolved";

export function FindingsTable({ findings }: { findings: Finding[] }) {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [sev, setSev] = useState<Severity | "all">("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [active, setActive] = useState<Finding | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [showResolved, setShowResolved] = useState(false);

  // Seed the search box from a ?q= param (Topbar search routes here).
  useEffect(() => {
    const q = params.get("q");
    if (q) setQuery(q);
  }, [params]);

  // Resolved findings persist locally so they survive reloads.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setResolved(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, []);

  function persist(next: Set<string>) {
    setResolved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  }

  function toggleResolve(id: string) {
    const next = new Set(resolved);
    next.has(id) ? next.delete(id) : next.add(id);
    persist(next);
  }

  const rows = useMemo(() => {
    let r = findings.filter((f) => (sev === "all" ? true : f.severity === sev));
    if (!showResolved) r = r.filter((f) => !resolved.has(f.id));
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((f) => f.accountName.toLowerCase().includes(q) || f.title.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => (sortDesc ? b.annualRecoverable - a.annualRecoverable : a.annualRecoverable - b.annualRecoverable));
  }, [findings, query, sev, sortDesc, resolved, showResolved]);

  const total = rows.reduce((s, f) => s + (resolved.has(f.id) ? 0 : f.annualRecoverable), 0);
  const resolvedCount = findings.filter((f) => resolved.has(f.id)).length;

  function exportAll() {
    if (rows.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(`metermatch-findings-${stamp}.csv`, findingsToCsv(rows));
  }

  function exportOne(f: Finding) {
    downloadText(`metermatch-finding-${f.accountId}-${f.rule}.csv`, findingsToCsv([f]));
  }

  function exportPdf() {
    if (rows.length === 0) return;
    const period = rows[0]?.period;
    exportFindingsPdf(rows, { period });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 flex-1 min-w-[220px] focus-within:border-white/15 transition">
          <Search size={15} className="text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search account or leakage type…"
            className="bg-transparent text-sm outline-none w-full placeholder:text-slate-600"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-500 hover:text-white" title="Clear">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSev(s)}
              className={`rounded-md px-3 py-1.5 text-xs capitalize border transition ${
                sev === s ? "border-white/15 bg-white/[0.08] text-white" : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={exportAll}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06] hover:border-white/20 transition disabled:opacity-40"
        >
          <Download size={13} /> Export CSV
        </button>
        <button
          onClick={exportPdf}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06] hover:border-white/20 transition disabled:opacity-40"
        >
          <FileText size={13} /> Export PDF
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500 tabular">
          {rows.length} {showResolved ? "shown" : "open"} · {usd2(total)} recoverable
        </p>
        {resolvedCount > 0 && (
          <button
            onClick={() => setShowResolved((v) => !v)}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            {showResolved ? "Hide" : "Show"} {resolvedCount} resolved
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-12 text-center">
          <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-accent-emerald/15 text-accent-emerald">
            <Check size={18} />
          </div>
          <p className="text-sm text-white font-medium">
            {findings.length === 0 ? "No leaks detected" : "Nothing matches your filters"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {findings.length === 0
              ? "This dataset reconciles cleanly — usage and billing agree."
              : "Try clearing the search or severity filter."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-wider text-slate-400 border-b border-white/[0.06]">
                <th className="px-5 py-3 font-medium">ACCOUNT</th>
                <th className="px-5 py-3 font-medium">LEAKAGE TYPE</th>
                <th className="px-5 py-3 font-medium">PERIOD</th>
                <th className="px-5 py-3 font-medium text-right">EXPECTED</th>
                <th className="px-5 py-3 font-medium text-right">BILLED</th>
                <th className="px-5 py-3 font-medium text-right">
                  <button onClick={() => setSortDesc((v) => !v)} className="inline-flex items-center gap-1 hover:text-white">
                    RECOVERABLE <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="px-5 py-3 font-medium">SEVERITY</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => {
                const s = severityStyle[f.severity];
                const isResolved = resolved.has(f.id);
                return (
                  <tr
                    key={f.id}
                    onClick={() => setActive(f)}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition ${
                      isResolved ? "opacity-45" : ""
                    }`}
                  >
                    <td className={`px-5 py-3.5 text-white ${isResolved ? "line-through" : ""}`}>{f.accountName}</td>
                    <td className="px-5 py-3.5 text-slate-300">{f.title}</td>
                    <td className="px-5 py-3.5 text-slate-500 tabular">{f.period}</td>
                    <td className="px-5 py-3.5 text-right tabular text-slate-300">{usd2(f.expected)}</td>
                    <td className="px-5 py-3.5 text-right tabular text-slate-400">{usd2(f.billed)}</td>
                    <td className="px-5 py-3.5 text-right tabular font-semibold text-accent-emerald">{usd2(f.annualRecoverable)}</td>
                    <td className="px-5 py-3.5">
                      {isResolved ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-accent-emerald/25 bg-accent-emerald/10 px-2.5 py-1 text-[11px] text-accent-emerald">
                          <Check size={11} /> Resolved
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] ${s.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-over drawer */}
      {active && (
        <div className="fixed inset-0 z-40" onClick={() => setActive(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 h-full w-full max-w-md bg-ink-900 border-l border-white/10 p-6 overflow-y-auto animate-rise"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500">{active.accountName}</p>
                <h3 className="font-display text-xl font-semibold mt-1">{active.title}</h3>
              </div>
              <button onClick={() => setActive(null)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
              <p className="text-xs text-slate-400">Annual recoverable</p>
              <p className="font-display text-accent-emerald text-4xl font-bold mt-1 tabular">{usd2(active.annualRecoverable)}</p>
              {resolved.has(active.id) ? (
                <span className="inline-flex items-center gap-1.5 mt-3 rounded-md border border-accent-emerald/25 bg-accent-emerald/10 px-2.5 py-1 text-[11px] text-accent-emerald">
                  <Check size={11} /> Resolved
                </span>
              ) : (
                <span className={`inline-flex items-center gap-1.5 mt-3 rounded-md border px-2.5 py-1 text-[11px] ${severityStyle[active.severity].cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${severityStyle[active.severity].dot}`} /> {severityStyle[active.severity].label}
                </span>
              )}
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mt-5">{active.detail}</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <p className="text-xs text-slate-500">Should have billed</p>
                <p className="font-display text-lg font-semibold tabular mt-1">{usd2(active.expected)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <p className="text-xs text-slate-500">Actually billed</p>
                <p className="font-display text-lg font-semibold tabular mt-1">{usd2(active.billed)}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => toggleResolve(active.id)}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition ${
                  resolved.has(active.id)
                    ? "border border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.04]"
                    : "bg-indigo-500 text-white hover:bg-indigo-400"
                }`}
              >
                {resolved.has(active.id) ? (
                  <>
                    <RotateCcw size={14} /> Reopen
                  </>
                ) : (
                  <>
                    <Check size={15} /> Mark as resolved
                  </>
                )}
              </button>
              <button
                onClick={() => exportOne(active)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] transition"
              >
                <Download size={14} /> Export
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
