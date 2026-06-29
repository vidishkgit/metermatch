"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Finding, Severity } from "@/lib/engine";
import { usd2, severityStyle } from "@/lib/format";
import { findingsToCsv, downloadText } from "@/lib/csv";
import { exportFindingsPdf } from "@/lib/pdf";
import { remediate } from "@/lib/remediation";
import { StripeDraftButton } from "@/components/StripeDraftButton";
import { X, ArrowUpDown, Search, Download, Check, FileText, Mail, ClipboardCopy, Wrench, CircleDot, Loader } from "lucide-react";

const SEVERITIES: (Severity | "all")[] = ["all", "critical", "high", "medium", "low"];
const STORAGE_KEY = "metermatch:status";

type Status = "open" | "in_progress" | "recovered";

const statusMeta: Record<Status, { label: string; cls: string; Icon: typeof CircleDot }> = {
  open: { label: "Open", cls: "border-slate-500/30 bg-slate-500/10 text-slate-300", Icon: CircleDot },
  in_progress: { label: "In progress", cls: "border-amber-500/30 bg-amber-500/10 text-amber-300", Icon: Loader },
  recovered: { label: "Recovered", cls: "border-accent-emerald/25 bg-accent-emerald/10 text-accent-emerald", Icon: Check },
};

export function FindingsTable({ findings }: { findings: Finding[] }) {
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const [sev, setSev] = useState<Severity | "all">("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [active, setActive] = useState<Finding | null>(null);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [showRecovered, setShowRecovered] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const q = params.get("q");
    if (q) setQuery(q);
  }, [params]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setStatuses(JSON.parse(raw) as Record<string, Status>);
    } catch {
      /* ignore */
    }
  }, []);

  function statusOf(id: string): Status {
    return statuses[id] ?? "open";
  }

  function setStatus(id: string, status: Status) {
    const next = { ...statuses, [id]: status };
    setStatuses(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const rows = useMemo(() => {
    let r = findings.filter((f) => (sev === "all" ? true : f.severity === sev));
    if (!showRecovered) r = r.filter((f) => statusOf(f.id) !== "recovered");
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((f) => f.accountName.toLowerCase().includes(q) || f.title.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => (sortDesc ? b.annualRecoverable - a.annualRecoverable : a.annualRecoverable - b.annualRecoverable));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findings, query, sev, sortDesc, statuses, showRecovered]);

  const openTotal = rows.reduce((s, f) => s + (statusOf(f.id) === "recovered" ? 0 : f.annualRecoverable), 0);
  const recovered = findings.filter((f) => statusOf(f.id) === "recovered");
  const recoveredAnnual = recovered.reduce((s, f) => s + f.annualRecoverable, 0);

  function exportAll() {
    if (rows.length === 0) return;
    downloadText(`metermatch-findings-${new Date().toISOString().slice(0, 10)}.csv`, findingsToCsv(rows));
  }
  function exportPdf() {
    if (rows.length > 0) exportFindingsPdf(rows, { period: rows[0]?.period });
  }

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
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
          {rows.length} {showRecovered ? "shown" : "open"} · {usd2(openTotal)} recoverable
        </p>
        {recovered.length > 0 && (
          <button onClick={() => setShowRecovered((v) => !v)} className="text-xs text-slate-400 hover:text-white transition">
            {showRecovered ? "Hide" : "Show"} {recovered.length} recovered · {usd2(recoveredAnnual)} captured
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
                <th className="px-5 py-3 font-medium">STATUS</th>
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
                const st = statusOf(f.id);
                const sm = statusMeta[st];
                return (
                  <tr
                    key={f.id}
                    onClick={() => setActive(f)}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition ${
                      st === "recovered" ? "opacity-50" : ""
                    }`}
                  >
                    <td className={`px-5 py-3.5 text-white ${st === "recovered" ? "line-through" : ""}`}>{f.accountName}</td>
                    <td className="px-5 py-3.5 text-slate-300">{f.title}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] ${sm.cls}`}>
                        <sm.Icon size={11} /> {sm.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular text-slate-300">{usd2(f.expected)}</td>
                    <td className="px-5 py-3.5 text-right tabular text-slate-400">{usd2(f.billed)}</td>
                    <td className="px-5 py-3.5 text-right tabular font-semibold text-accent-emerald">{usd2(f.annualRecoverable)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] ${s.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
                      </span>
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
              <span className={`inline-flex items-center gap-1.5 mt-3 rounded-md border px-2.5 py-1 text-[11px] ${severityStyle[active.severity].cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${severityStyle[active.severity].dot}`} /> {severityStyle[active.severity].label}
              </span>
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

            {/* Remediation */}
            {(() => {
              const rem = remediate(active);
              return (
                <div className="mt-6 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.06] p-5">
                  <div className="flex items-center gap-2 text-indigo-100">
                    <Wrench size={15} className="text-indigo-300" />
                    <p className="text-sm font-semibold">How to fix it</p>
                  </div>
                  <p className="mt-2 text-sm text-white">{rem.action}</p>
                  <p className="mt-0.5 text-xs text-indigo-200/80">One-time correction: {usd2(rem.oneTime)}</p>
                  <ol className="mt-3 space-y-1.5">
                    {rem.steps.map((s, i) => (
                      <li key={i} className="flex gap-2 text-xs text-slate-300">
                        <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white/10 text-[9px] text-white">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => copy("email", `Subject: ${rem.email.subject}\n\n${rem.email.body}`)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-indigo-50 hover:bg-white/10 transition"
                    >
                      <Mail size={12} /> {copied === "email" ? "Copied!" : "Copy customer email"}
                    </button>
                    <button
                      onClick={() => copy("memo", rem.memo)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-indigo-50 hover:bg-white/10 transition"
                    >
                      <ClipboardCopy size={12} /> {copied === "memo" ? "Copied!" : "Copy memo"}
                    </button>
                    <button
                      onClick={() => downloadText(`correction-${active.accountId}-${active.rule}.txt`, rem.memo, "text/plain")}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-indigo-50 hover:bg-white/10 transition"
                    >
                      <Download size={12} /> Memo .txt
                    </button>
                  </div>
                  <StripeDraftButton
                    customerId={active.accountId}
                    amount={rem.oneTime}
                    description={`MeterMatch correction — ${active.title} (${active.period})`}
                  />
                </div>
              );
            })()}

            {/* Status workflow */}
            <div className="mt-6">
              <p className="text-xs font-medium text-slate-400 mb-2">Status</p>
              <div className="grid grid-cols-3 gap-2">
                {(["open", "in_progress", "recovered"] as Status[]).map((st) => {
                  const sm = statusMeta[st];
                  const isCur = statusOf(active.id) === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setStatus(active.id, st)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                        isCur ? sm.cls : "border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <sm.Icon size={13} /> {sm.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
