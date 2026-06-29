"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, KeyRound } from "lucide-react";
import { verifyOtp, requestOtp } from "@/app/actions-auth";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const devCode = params.get("dev");

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await verifyOtp(email, code);
      if (!res.ok) {
        setError(res.error ?? "Couldn't verify that code.");
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  function resend() {
    setError(null);
    setResent(false);
    start(async () => {
      const res = await requestOtp(email);
      if (res.ok) setResent(true);
      else setError(res.error ?? "Couldn't resend.");
    });
  }

  if (!email) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center shadow-card">
        <p className="text-sm text-slate-400">No email on file.</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 transition"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 md:p-8 shadow-card">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
          <KeyRound size={12} /> Check your inbox
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Enter your code</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          We sent a 6-digit code to <span className="text-slate-200">{email}</span>. It expires in 10 minutes.
        </p>
      </div>

      {devCode && (
        <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3">
          <p className="text-[11px] font-medium text-amber-300/90">
            Dev mode — email isn&apos;t configured (no SES sender), so we&apos;re showing the code here.
          </p>
          <p className="mt-1.5 flex items-center justify-between gap-2">
            <span className="font-mono text-2xl font-bold tracking-[0.4em] text-amber-200">{devCode}</span>
            <button
              type="button"
              onClick={() => setCode(devCode)}
              className="shrink-0 rounded-md border border-amber-400/30 px-2.5 py-1 text-[11px] font-medium text-amber-200 hover:bg-amber-400/10 transition"
            >
              Autofill
            </button>
          </p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <input
          inputMode="numeric"
          autoFocus
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="••••••"
          className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-3 text-center text-2xl font-semibold tracking-[0.5em] text-white placeholder:text-slate-700 outline-none focus:border-indigo-400/60 focus:bg-white/[0.06] transition"
        />

        {error && <p className="text-sm text-rose-400">{error}</p>}
        {resent && <p className="text-sm text-accent-emerald">New code sent.</p>}

        <button
          type="submit"
          disabled={pending || code.length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 transition disabled:opacity-50"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {pending ? "Verifying…" : "Verify & continue"}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between text-[12px] text-slate-500">
        <button onClick={() => router.push("/login")} className="hover:text-slate-300 transition">
          ← Change email
        </button>
        <button onClick={resend} disabled={pending} className="hover:text-slate-300 transition disabled:opacity-50">
          Resend code
        </button>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center text-sm text-slate-400">Loading…</div>}>
      <VerifyInner />
    </Suspense>
  );
}
