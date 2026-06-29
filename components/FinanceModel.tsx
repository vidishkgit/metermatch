"use client";

import { Fragment, useMemo, useState } from "react";
import {
  buildModel,
  DEFAULT_ASSUMPTIONS,
  PRESETS,
  type Assumptions,
  type PresetName,
  type YearLine,
} from "@/lib/finance";
import { usdCompact, usd, pct } from "@/lib/format";
import { TrendingUp, Sparkles, RotateCcw, Scale } from "lucide-react";

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-slate-400">{label}</span>
        <span className="text-xs font-medium text-white tabular">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-indigo-500"
      />
    </div>
  );
}

export function FinanceModel({
  baselineArr,
  recoveredArr,
}: {
  baselineArr: number;
  recoveredArr: number;
}) {
  const [a, setA] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [scenario, setScenario] = useState<"baseline" | "withRecovery">("withRecovery");
  const [preset, setPreset] = useState<PresetName | "Custom">("Base");

  const model = useMemo(() => buildModel(baselineArr, recoveredArr, a), [baselineArr, recoveredArr, a]);
  const set = (k: keyof Assumptions) => (v: number) => {
    setPreset("Custom");
    setA((prev) => ({ ...prev, [k]: v }));
  };
  const applyPreset = (name: PresetName) => {
    setPreset(name);
    setA((prev) => ({ ...prev, ...PRESETS[name] }));
  };

  const proj = scenario === "baseline" ? model.baseline : model.withRecovery;
  const years = proj.lines.map((l) => l.year);

  const rows: { label: string; key: keyof YearLine; strong?: boolean; section?: string }[] = [
    { label: "Revenue", key: "revenue", section: "Income statement", strong: true },
    { label: "COGS", key: "cogs" },
    { label: "Gross profit", key: "grossProfit", strong: true },
    { label: "Sales & marketing", key: "sm" },
    { label: "Research & development", key: "rd" },
    { label: "General & admin", key: "ga" },
    { label: "Total opex", key: "opex" },
    { label: "EBIT", key: "ebit", strong: true },
    { label: "Taxes", key: "taxes" },
    { label: "NOPAT", key: "nopat", strong: true },
    { label: "+ D&A", key: "da", section: "Cash flow" },
    { label: "− Capex", key: "capex" },
    { label: "− Δ NWC", key: "deltaNwc" },
    { label: "Free cash flow", key: "fcf", strong: true },
    { label: "Cash (cumulative)", key: "cash", section: "Balance sheet" },
    { label: "Receivables", key: "receivables" },
  ];

  const maxFcf = Math.max(...model.withRecovery.lines.map((l) => l.fcf), 1);

  return (
    <div className="space-y-6">
      {/* Hero: EV uplift */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015] p-8">
        <div className="absolute -right-16 -top-28 h-64 w-64 rounded-full bg-accent-emerald/[0.06] blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-accent-emerald/25 bg-accent-emerald/10 px-2.5 py-1 text-xs text-emerald-200 mb-5">
            <Sparkles size={13} /> Enterprise-value impact
          </div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">
            VALUE CREATED BY PLUGGING THIS LEAK
          </p>
          <p className="font-display text-accent-emerald text-6xl md:text-7xl font-bold mt-2 tabular">
            {usdCompact(model.evUplift)}
          </p>
          <p className="mt-4 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Recovering{" "}
            <span className="text-white font-medium">{usd(recoveredArr)}/yr</span> of leaked
            revenue — at near-100% margin — compounds into ARR and lifts modeled enterprise value
            by <span className="text-accent-emerald font-medium">{usdCompact(model.evUplift)}</span>.
            That&apos;s <span className="text-white font-medium">{model.paybackYears.toFixed(1)}×</span>{" "}
            the annual recovery, on a {a.years}-year DCF at a {pct(a.wacc)} discount rate.
          </p>
        </div>
      </div>

      {/* Scenario presets */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-slate-500">Scenario preset</p>
        <div className="flex items-center gap-1.5">
          {(["Conservative", "Base", "Aggressive"] as const).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition ${
                preset === p ? "bg-indigo-500 text-white" : "border border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
          {preset === "Custom" && (
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400">
              Custom
            </span>
          )}
        </div>
      </div>

      {/* EV cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Baseline enterprise value", v: model.baseline.enterpriseValue, tone: "text-slate-200" },
          { label: "With recovered revenue", v: model.withRecovery.enterpriseValue, tone: "text-white" },
          { label: "EV uplift", v: model.evUplift, tone: "text-accent-emerald" },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400">
              {c.label.toUpperCase()}
            </p>
            <p className={`font-display text-3xl font-semibold tabular mt-2 ${c.tone}`}>
              {usdCompact(c.v)}
            </p>
          </div>
        ))}
      </div>

      {/* Comp cross-check */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-5 flex items-center gap-4 flex-wrap">
        <span className="grid place-items-center h-10 w-10 shrink-0 rounded-lg bg-white/[0.04] text-indigo-400">
          <Scale size={18} />
        </span>
        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-medium text-white">Valuation cross-check</p>
          <p className="text-xs text-slate-500 mt-0.5">
            DCF implies <span className="text-slate-200">{model.evMultipleBaseline.toFixed(1)}×</span> revenue;
            peers trade at <span className="text-slate-200">{a.compMultiple.toFixed(1)}×</span>. At the comp
            multiple, baseline EV would be {usdCompact(model.compEv)}.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400">DCF vs COMP</p>
          <p
            className={`font-display text-2xl font-semibold tabular ${
              model.baseline.enterpriseValue >= model.compEv ? "text-accent-emerald" : "text-amber-300"
            }`}
          >
            {model.compEv > 0 ? `${((model.baseline.enterpriseValue / model.compEv - 1) * 100).toFixed(0)}%` : "—"}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Assumptions */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <TrendingUp size={17} className="text-indigo-400" /> Assumptions
            </h2>
            <button
              onClick={() => { setA(DEFAULT_ASSUMPTIONS); setPreset("Base"); }}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
          <Slider label="Revenue growth (gross)" value={a.growthRate} min={0} max={1} step={0.01} format={(v) => pct(v)} onChange={set("growthRate")} />
          <Slider label="Revenue churn" value={a.churnRate} min={0} max={0.3} step={0.01} format={(v) => pct(v)} onChange={set("churnRate")} />
          <Slider label="Gross margin" value={a.grossMarginPct} min={0.4} max={0.95} step={0.01} format={(v) => pct(v)} onChange={set("grossMarginPct")} />
          <div className="pt-1 border-t border-white/[0.06]">
            <p className="text-[10px] font-semibold tracking-[0.15em] text-accent-violet mb-3 mt-2">OPEX SPLIT (% REVENUE)</p>
            <div className="space-y-4">
              <Slider label="Sales & marketing" value={a.smPct} min={0} max={0.6} step={0.01} format={(v) => pct(v)} onChange={set("smPct")} />
              <Slider label="Research & development" value={a.rdPct} min={0} max={0.4} step={0.01} format={(v) => pct(v)} onChange={set("rdPct")} />
              <Slider label="General & admin" value={a.gaPct} min={0} max={0.3} step={0.01} format={(v) => pct(v)} onChange={set("gaPct")} />
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Total opex {pct(a.smPct + a.rdPct + a.gaPct)}</p>
          </div>
          <div className="pt-1 border-t border-white/[0.06] space-y-4">
            <Slider label="WACC (discount rate)" value={a.wacc} min={0.06} max={0.25} step={0.005} format={(v) => pct(v, 1)} onChange={set("wacc")} />
            <Slider label="Terminal growth" value={a.terminalGrowth} min={0} max={0.05} step={0.005} format={(v) => pct(v, 1)} onChange={set("terminalGrowth")} />
            <Slider label="Peer EV/Revenue multiple" value={a.compMultiple} min={2} max={20} step={0.5} format={(v) => `${v.toFixed(1)}×`} onChange={set("compMultiple")} />
            <Slider label="Projection years" value={a.years} min={3} max={10} step={1} format={(v) => `${v}y`} onChange={set("years")} />
          </div>
        </div>

        {/* Statements */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.07] bg-white/[0.015] p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold">Projected statements</h2>
            <div className="flex items-center gap-1.5">
              {(["baseline", "withRecovery"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScenario(s)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium border transition ${
                    scenario === s
                      ? "border-white/15 bg-white/[0.08] text-white"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  {s === "baseline" ? "Baseline" : "With recovery"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] tracking-wider text-slate-400 border-b border-white/[0.06]">
                  <th className="text-left py-2 pr-3 font-medium">LINE</th>
                  {years.map((y) => (
                    <th key={y} className="text-right py-2 px-2 font-medium">Y{y}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Fragment key={row.key}>
                    {row.section && (
                      <tr>
                        <td colSpan={years.length + 1} className="pt-3 pb-1">
                          <span className="text-[10px] font-semibold tracking-[0.15em] text-accent-violet">
                            {row.section.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-white/[0.03]">
                      <td className={`py-2 pr-3 ${row.strong ? "text-white font-medium" : "text-slate-400"}`}>
                        {row.label}
                      </td>
                      {proj.lines.map((l) => {
                        const v = l[row.key] as number;
                        const neg = v < 0;
                        return (
                          <td
                            key={l.year}
                            className={`py-2 px-2 text-right tabular ${
                              neg ? "text-rose-300" : row.strong ? "text-white" : "text-slate-400"
                            }`}
                          >
                            {usdCompact(v)}
                          </td>
                        );
                      })}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FCF chart */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-semibold">Free cash flow by year</h2>
            <p className="text-xs text-slate-500">
              Baseline vs. with recovered revenue — the gap is high-margin upside.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-slate-500" /> Baseline
            </span>
            <span className="flex items-center gap-1.5 text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-accent-emerald" /> With recovery
            </span>
          </div>
        </div>
        <div className="flex items-end gap-3 h-44">
          {model.withRecovery.lines.map((l, i) => {
            const baseH = (model.baseline.lines[i].fcf / maxFcf) * 100;
            const fullH = (l.fcf / maxFcf) * 100;
            return (
              <div key={l.year} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                <div className="relative w-full max-w-[48px] h-full flex items-end">
                  <div
                    className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-accent-emerald/40 to-accent-emerald/80"
                    style={{ height: `${fullH}%` }}
                  />
                  <div
                    className="absolute bottom-0 w-full rounded-t-md bg-white/15"
                    style={{ height: `${baseH}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500">Y{l.year}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-slate-600 leading-relaxed">
        Illustrative model. EV is a discounted-cash-flow estimate from the assumptions above;
        recovered revenue is modeled at {pct(a.recoveredGrossMarginPct)} gross margin since the
        underlying service was already delivered. Adjust the sliders to fit your business.
      </p>
    </div>
  );
}
