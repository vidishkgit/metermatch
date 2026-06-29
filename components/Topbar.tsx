"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Sparkles, LogOut, X, ArrowRight } from "lucide-react";
import { MeterMark } from "./MeterMark";
import { signOut } from "@/app/actions-auth";
import { useActiveDataset } from "@/lib/dataset";
import { runReconciliation } from "@/lib/engine";
import { usd2, severityStyle } from "@/lib/format";
import type { Severity } from "@/lib/engine";

export interface TopbarAlert {
  id: string;
  accountName: string;
  title: string;
  annualRecoverable: number;
  severity: Severity;
}

export function Topbar({
  email,
  alerts = [],
  totalAnnual = 0,
}: {
  email?: string;
  alerts?: TopbarAlert[];
  totalAnnual?: number;
}) {
  const live = process.env.NEXT_PUBLIC_DATA_SOURCE === "aws";
  const initial = email?.[0]?.toUpperCase() ?? "?";
  const router = useRouter();

  // When an upload is driving the app, recompute alerts + total from it so the
  // topbar matches the dashboard instead of the server's live/sample numbers.
  const dataset = useActiveDataset();
  const overrideScan = dataset ? runReconciliation({ period: dataset.period, accounts: dataset.accounts }) : null;
  const activeAlerts: TopbarAlert[] = overrideScan
    ? [...overrideScan.findings]
        .sort((a, b) => b.annualRecoverable - a.annualRecoverable)
        .slice(0, 5)
        .map((f) => ({ id: f.id, accountName: f.accountName, title: f.title, annualRecoverable: f.annualRecoverable, severity: f.severity }))
    : alerts;
  const activeTotal = overrideScan ? overrideScan.summary.totalAnnualRecoverable : totalAnnual;

  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/findings?q=${encodeURIComponent(term)}` : "/findings");
    setSearchOpen(false);
    setQ("");
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 py-4 border-b border-white/[0.06] bg-ink-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <MeterMark />
          <span className="font-display text-base font-semibold tracking-tight">MeterMatch</span>
        </Link>
        <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
          <span className={`h-1.5 w-1.5 rounded-full ${dataset ? "bg-indigo-400" : live ? "bg-accent-emerald" : "bg-indigo-400"}`} />
          {dataset ? `Uploaded · ${dataset.name}` : live ? "AWS live · DynamoDB + Aurora" : "Sample dataset"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <button
            onClick={() => {
              setSearchOpen((v) => !v);
              setBellOpen(false);
            }}
            className="hidden sm:grid place-items-center h-9 w-9 rounded-lg border border-white/[0.07] bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05] transition"
            title="Search findings"
          >
            <Search size={16} />
          </button>
          {searchOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/10 bg-ink-850 p-2 shadow-2xl">
              <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 focus-within:border-white/15">
                <Search size={15} className="text-slate-500" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search account or leakage type…"
                  className="bg-transparent text-sm outline-none w-full placeholder:text-slate-600"
                />
                <button type="submit" className="text-slate-500 hover:text-white" title="Search">
                  <ArrowRight size={15} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setBellOpen((v) => !v);
              setSearchOpen(false);
            }}
            className="relative hidden sm:grid place-items-center h-9 w-9 rounded-lg border border-white/[0.07] bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/[0.05] transition"
            title="Alerts"
          >
            <Bell size={16} />
            {activeAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-indigo-500 px-1 text-[10px] font-semibold text-white">
                {activeAlerts.length}
              </span>
            )}
          </button>
          {bellOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/10 bg-ink-850 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                <p className="text-sm font-medium text-white">Top leaks</p>
                <button onClick={() => setBellOpen(false)} className="text-slate-500 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              {activeAlerts.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-slate-500">No active findings.</p>
              ) : (
                <>
                  <div className="max-h-80 overflow-y-auto">
                    {activeAlerts.map((a) => {
                      const s = severityStyle[a.severity];
                      return (
                        <Link
                          key={a.id}
                          href={`/findings?q=${encodeURIComponent(a.accountName)}`}
                          onClick={() => setBellOpen(false)}
                          className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white">{a.accountName}</p>
                            <p className="truncate text-xs text-slate-500">{a.title}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-accent-emerald tabular">{usd2(a.annualRecoverable)}</p>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  <Link
                    href="/findings"
                    onClick={() => setBellOpen(false)}
                    className="block px-4 py-3 text-center text-xs text-indigo-400 hover:text-indigo-300 transition"
                  >
                    View all findings · {usd2(activeTotal)} recoverable
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <Link
          href="/data-sources"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 transition"
        >
          <Sparkles size={15} />
          <span className="hidden sm:inline">Run new scan</span>
          <span className="sm:hidden">Scan</span>
        </Link>

        <div className="group relative">
          <button
            title={email}
            className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-500 text-sm font-semibold text-white"
          >
            {initial}
          </button>
          <div className="absolute right-0 top-full pt-2 opacity-0 pointer-events-none translate-y-1 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:translate-y-0 transition">
            <div className="w-56 rounded-xl border border-white/10 bg-ink-850 p-2 shadow-2xl">
              {email && (
                <div className="px-2 py-1.5 text-xs text-slate-400">
                  Signed in as
                  <div className="truncate text-slate-200">{email}</div>
                </div>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-white/[0.06] hover:text-white transition"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
