"use client";

import { useState } from "react";
import { createStripeDraftCorrection } from "@/app/actions-stripe";
import { usd2 } from "@/lib/format";
import { CreditCard, Loader2, Check } from "lucide-react";

// Phase 3 write-back: push a DRAFT correction (pending invoice item) to Stripe.
// Only shown for Stripe-sourced accounts (customer id starts with cus_).
export function StripeDraftButton({
  customerId,
  amount,
  description,
}: {
  customerId: string;
  amount: number;
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!/^cus_/.test(customerId)) return null;

  async function submit() {
    setError(null);
    setBusy(true);
    const res = await createStripeDraftCorrection({ apiKey: key, customerId, amount, description });
    setBusy(false);
    if (!res.ok) return setError(res.error ?? "Failed.");
    setDone(res.id ?? "created");
  }

  if (done) {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-xs text-accent-emerald">
        <Check size={13} /> Draft correction of {usd2(amount)} added in Stripe ({done}). Review &amp; invoice it there.
      </p>
    );
  }

  return (
    <div className="mt-3">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-indigo-50 hover:bg-white/10 transition"
        >
          <CreditCard size={12} /> Push draft to Stripe
        </button>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[11px] text-slate-400">
            Creates a <span className="text-white">draft</span> invoice item of {usd2(amount)} on this Stripe customer. Not a charge — you finalize it in Stripe.
          </p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk_test_…"
            className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 font-mono text-xs text-white placeholder:text-slate-600 outline-none focus:border-indigo-400/60"
          />
          {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              onClick={submit}
              disabled={busy || key.trim().length < 8}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400 transition disabled:opacity-50"
            >
              {busy ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
              {busy ? "Creating…" : "Create draft"}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
