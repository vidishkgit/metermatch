"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail, Loader2, ShieldCheck } from "lucide-react";
import { requestOtp } from "@/app/actions-auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await requestOtp(email);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      const params = new URLSearchParams({ email: email.trim().toLowerCase() });
      if (!res.delivered && res.devCode) params.set("dev", res.devCode);
      router.push(`/verify?${params.toString()}`);
    });
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 md:p-8 shadow-card">
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-400">
          <ShieldCheck size={12} /> Passwordless · email code
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Sign in to MeterMatch</h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Enter your work email and we&apos;ll send a 6-digit code. New here? The same step signs you up.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Email address</span>
          <div className="relative">
            <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg bg-white/[0.04] border border-white/10 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-400/60 focus:bg-white/[0.06] transition"
            />
          </div>
        </label>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-400 transition disabled:opacity-60"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {pending ? "Sending code…" : "Send code"}
        </button>
      </form>

      <p className="mt-5 text-center text-[11px] text-slate-600">
        By continuing you agree to our terms. We never share your email.
      </p>
    </div>
  );
}
