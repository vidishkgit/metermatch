import { Check, Sparkles } from "lucide-react";

const TIERS = [
  {
    name: "Starter",
    price: "$199",
    cadence: "/mo",
    tagline: "For early usage-based SaaS finding their first leaks.",
    features: [
      "Up to 100 accounts scanned",
      "Daily reconciliation",
      "All 10 leakage detectors",
      "Findings dashboard + export",
    ],
    accent: false,
  },
  {
    name: "Growth",
    price: "$399",
    cadence: "/mo",
    tagline: "For teams treating leakage as a revenue line.",
    features: [
      "Up to 1,000 accounts scanned",
      "Hourly reconciliation",
      "Slack + email alerts on new leaks",
      "Resolution workflow & audit trail",
      "API access",
    ],
    accent: true,
  },
  {
    name: "Scale",
    price: "$499",
    cadence: "/mo",
    tagline: "For high-volume metering across many plans.",
    features: [
      "Unlimited accounts scanned",
      "Real-time reconciliation",
      "Custom detection rules",
      "SSO + role-based access",
      "Dedicated support",
    ],
    accent: false,
  },
];

export default function PricingPage() {
  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Pricing</h1>
        <p className="text-sm text-slate-500">
          Flat plans for predictable cost — or pay only on what we recover.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`relative rounded-xl p-6 border bg-white/[0.015] transition ${
              t.accent ? "border-indigo-500/40 bg-indigo-500/[0.04]" : "border-white/[0.07] hover:border-white/15"
            }`}
          >
            {t.accent && (
              <span className="absolute -top-2.5 left-6 inline-flex items-center gap-1 rounded-md bg-indigo-500 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                <Sparkles size={11} /> Most popular
              </span>
            )}
            <p className="text-sm font-medium text-white">{t.name}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold tabular">{t.price}</span>
              <span className="text-sm text-slate-500">{t.cadence}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed min-h-[32px]">{t.tagline}</p>
            <button
              className={`mt-5 w-full rounded-lg py-2.5 text-sm font-medium transition ${
                t.accent
                  ? "bg-indigo-500 text-white hover:bg-indigo-400"
                  : "border border-white/10 text-slate-200 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              Start free trial
            </button>
            <ul className="mt-6 space-y-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check size={15} className="mt-0.5 shrink-0 text-accent-emerald" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Performance plan */}
      <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.015] p-6">
        <div className="absolute -right-16 -top-24 h-56 w-56 rounded-full bg-indigo-500/[0.06] blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold">Performance</h2>
              <span className="rounded-md border border-accent-emerald/25 bg-accent-emerald/10 px-2 py-0.5 text-[10px] text-emerald-200">
                Aligned incentives
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
              No subscription. We take <span className="text-white font-medium">15% of revenue recovered</span>{" "}
              that you successfully re-bill. If we don&apos;t find leaks, you don&apos;t pay — so the product
              pays for itself by definition.
            </p>
          </div>
          <button className="shrink-0 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-400 transition">
            Talk to us
          </button>
        </div>
      </div>
    </div>
  );
}
