"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X, Loader2, ShieldCheck, Link2, Settings2, ArrowRight } from "lucide-react";
import { importFromStripe } from "@/app/actions-stripe";
import { writeDataset } from "@/lib/dataset";

type Cat = "Billing" | "Subscriptions" | "Warehouse" | "Accounting";
type AuthKind = "api_key" | "oauth";

interface Source {
  id: string;
  name: string;
  desc: string;
  cat: Cat;
  color: string;        // brand color
  mark: string;         // short monogram / glyph
  auth: AuthKind;
  keyPrefix?: string;   // example key prefix for the input hint
  popular?: boolean;
}

const SOURCES: Source[] = [
  { id: "stripe", name: "Stripe", desc: "Invoices, usage records & subscriptions — live import", cat: "Billing", color: "#635BFF", mark: "S", auth: "api_key", keyPrefix: "sk_", popular: true },
  { id: "chargebee", name: "Chargebee", desc: "Subscription billing & entitlements", cat: "Subscriptions", color: "#FF6C37", mark: "cb", auth: "api_key", keyPrefix: "cb_live_", popular: true },
  { id: "recurly", name: "Recurly", desc: "Recurring billing & revenue", cat: "Subscriptions", color: "#E0457B", mark: "R", auth: "api_key", keyPrefix: "rk_" },
  { id: "zuora", name: "Zuora", desc: "Enterprise usage rating & billing", cat: "Billing", color: "#F26722", mark: "Z", auth: "oauth" },
  { id: "metronome", name: "Metronome", desc: "Usage metering & rating", cat: "Billing", color: "#5B5BD6", mark: "M", auth: "api_key", keyPrefix: "mtr_", popular: true },
  { id: "orb", name: "Orb", desc: "Usage-based billing events", cat: "Billing", color: "#14B8A6", mark: "O", auth: "api_key", keyPrefix: "orb_" },
  { id: "snowflake", name: "Snowflake", desc: "Warehouse usage & event tables", cat: "Warehouse", color: "#29B5E8", mark: "❄", auth: "oauth", popular: true },
  { id: "bigquery", name: "BigQuery", desc: "Event & metering datasets", cat: "Warehouse", color: "#4285F4", mark: "BQ", auth: "oauth" },
  { id: "redshift", name: "Redshift", desc: "Usage event warehouse", cat: "Warehouse", color: "#8C4FFF", mark: "RS", auth: "api_key", keyPrefix: "rs_" },
  { id: "quickbooks", name: "QuickBooks", desc: "GL, invoices & payments", cat: "Accounting", color: "#2CA01C", mark: "qb", auth: "oauth" },
  { id: "netsuite", name: "NetSuite", desc: "Revenue, AR & ledger", cat: "Accounting", color: "#1F6FBF", mark: "N", auth: "api_key", keyPrefix: "ns_" },
  { id: "maxio", name: "Maxio", desc: "SaaS billing & metrics", cat: "Subscriptions", color: "#6D28D9", mark: "Mx", auth: "api_key", keyPrefix: "mx_" },
];

const CATS: ("All" | Cat)[] = ["All", "Billing", "Subscriptions", "Warehouse", "Accounting"];

function Mark({ source, size = 40 }: { source: Source; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg font-semibold"
      style={{
        width: size,
        height: size,
        background: `${source.color}1f`,
        color: source.color,
        border: `1px solid ${source.color}40`,
        fontSize: size * 0.4,
      }}
    >
      {source.mark}
    </span>
  );
}

interface Connection {
  maskedKey: string;
}

export function Integrations() {
  const [filter, setFilter] = useState<"All" | Cat>("All");
  const [connections, setConnections] = useState<Record<string, Connection>>({});
  const [modal, setModal] = useState<Source | null>(null);

  const shown = SOURCES.filter((s) => filter === "All" || s.cat === filter);
  const connectedCount = Object.keys(connections).length;

  function disconnect(id: string) {
    setConnections((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white">Connect a source</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Pull billing, subscription and usage data directly into reconciliation.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                filter === c
                  ? "bg-white/[0.08] text-white border border-white/15"
                  : "text-slate-400 hover:text-white border border-transparent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {connectedCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-emerald/15 text-accent-emerald">
            <Check size={12} />
          </span>
          {connectedCount} of {SOURCES.length} sources connected
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {shown.map((s) => {
          const conn = connections[s.id];
          return (
            <div
              key={s.id}
              className="group rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 transition hover:border-white/15 hover:bg-white/[0.03]"
            >
              <div className="flex items-start gap-3">
                <Mark source={s} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{s.name}</p>
                    {s.popular && !conn && (
                      <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                        Popular
                      </span>
                    )}
                    {conn && (
                      <span className="inline-flex items-center gap-1 rounded border border-accent-emerald/25 bg-accent-emerald/10 px-1.5 py-0.5 text-[9px] font-medium text-accent-emerald">
                        <Check size={9} /> Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                {conn ? (
                  <>
                    <span className="font-mono text-[11px] text-slate-500">{conn.maskedKey}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setModal(s)}
                        className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                        title="Manage"
                      >
                        <Settings2 size={13} />
                      </button>
                      <button
                        onClick={() => disconnect(s.id)}
                        className="rounded-md px-2.5 py-1 text-xs text-slate-400 hover:text-rose-300 transition"
                      >
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setModal(s)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06] hover:border-white/20 transition"
                  >
                    {s.auth === "oauth" ? <Link2 size={12} /> : <Plus size={12} />}
                    {s.auth === "oauth" ? "Connect" : "Add API key"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <ConnectModal
          source={modal}
          existing={connections[modal.id]}
          onClose={() => setModal(null)}
          onConnect={(maskedKey) => {
            setConnections((prev) => ({ ...prev, [modal.id]: { maskedKey } }));
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function ConnectModal({
  source,
  existing,
  onClose,
  onConnect,
}: {
  source: Source;
  existing?: Connection;
  onClose: () => void;
  onConnect: (maskedKey: string) => void;
}) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<{ count: number; warnings: string[] } | null>(null);

  const isOauth = source.auth === "oauth";
  const isStripe = source.id === "stripe";

  async function submit() {
    setError(null);
    const trimmed = key.trim();
    if (!isOauth && trimmed.length < 8) {
      setError("That key looks too short. Paste the full secret key.");
      return;
    }

    // Stripe = a real, live import that drives the whole app.
    if (isStripe) {
      setBusy(true);
      const res = await importFromStripe(trimmed);
      setBusy(false);
      if (res.error) return setError(res.error);
      if (res.accounts.length === 0) {
        return setError(res.errors[0] ?? "No usage-based subscriptions found to import.");
      }
      writeDataset({
        accounts: res.accounts,
        name: "Stripe (live)",
        kind: "stripe",
        period: res.period,
        uploadedAt: Date.now(),
      });
      setImported({ count: res.accounts.length, warnings: res.errors });
      return;
    }

    // Every other source is a non-functional showcase handshake.
    setBusy(true);
    setTimeout(() => {
      const masked = isOauth
        ? `${source.name} workspace · OAuth`
        : `${source.keyPrefix ?? ""}••••${trimmed.slice(-4)}`;
      onConnect(masked);
    }, 1100);
  }

  function finishStripe() {
    onConnect(`sk_••••${key.trim().slice(-4)}`);
    router.push("/");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-ink-850 p-6 shadow-2xl"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-500 hover:text-white">
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <Mark source={source} size={44} />
          <div>
            <h3 className="text-base font-semibold text-white">
              {existing ? "Manage" : "Connect"} {source.name}
            </h3>
            <p className="text-xs text-slate-500">{source.desc}</p>
          </div>
        </div>

        {imported ? (
          <>
            <div className="mt-5 rounded-xl border border-accent-emerald/25 bg-accent-emerald/[0.07] p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-100">
                <Check size={15} className="text-accent-emerald" />
                Imported {imported.count} account{imported.count === 1 ? "" : "s"} from Stripe.
              </p>
              <p className="mt-1 text-xs text-emerald-200/80">
                Reconciliation now runs on your live Stripe data across the whole app.
              </p>
              {imported.warnings.length > 0 && (
                <p className="mt-2 text-[11px] text-amber-200/80">
                  {imported.warnings.length} subscription(s) skipped (no usage-based price).
                </p>
              )}
            </div>
            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={finishStripe}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 transition"
              >
                View dashboard <ArrowRight size={15} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-5">
              {isOauth ? (
                <p className="text-sm text-slate-400 leading-relaxed">
                  You&apos;ll be redirected to {source.name} to authorize read-only access to your
                  billing and usage data. MeterMatch never sees your login credentials.
                </p>
              ) : (
                <>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    {source.name} API secret key
                  </label>
                  <input
                    autoFocus
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder={`${source.keyPrefix ?? ""}••••••••••••••••`}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-400/60 focus:bg-white/[0.06] transition"
                  />
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <ShieldCheck size={12} />
                    {isStripe
                      ? "Used once to import, server-side. Use a read-only restricted key."
                      : "Preview connector — handshake only, no data is fetched yet."}
                  </p>
                </>
              )}
              {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={submit}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 transition disabled:opacity-60"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : isOauth ? <Link2 size={15} /> : <Check size={15} />}
                {busy ? (isStripe ? "Importing…" : "Connecting…") : isStripe ? "Import from Stripe" : isOauth ? `Authorize ${source.name}` : existing ? "Update key" : "Connect"}
              </button>
              <button
                onClick={onClose}
                className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
