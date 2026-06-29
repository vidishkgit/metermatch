// MeterMatch — financial-impact model.
// Pure, dependency-free so it runs on both server and client (live sliders).
//
// The story: recovered revenue is near-100% margin (the service was already
// delivered), so plugging a leak compounds into ARR, flows to free cash flow,
// and lifts enterprise value by a multiple of the raw recovered amount.

export interface Assumptions {
  growthRate: number;        // gross annual revenue growth, e.g. 0.30
  churnRate: number;         // annual gross revenue churn, e.g. 0.08 (net growth = growth − churn)
  grossMarginPct: number;    // baseline gross margin, e.g. 0.78
  // Opex decomposed (S&M + R&D + G&A); their sum is total opex % of revenue.
  smPct: number;             // sales & marketing as % of revenue
  rdPct: number;             // research & development as % of revenue
  gaPct: number;             // general & admin as % of revenue
  opexPct: number;           // derived total opex % (kept for the recovered stream)
  daPct: number;             // depreciation & amortization as % of revenue
  capexPct: number;          // capex as % of revenue
  nwcPct: number;            // change in net working capital as % of revenue growth
  taxRate: number;           // e.g. 0.21
  wacc: number;              // discount rate, e.g. 0.12
  terminalGrowth: number;    // perpetuity growth, e.g. 0.03
  years: number;             // projection horizon, e.g. 5
  compMultiple: number;      // peer EV/Revenue multiple for the sanity cross-check
  // Recovered revenue economics (high margin, low incremental cost):
  recoveredGrossMarginPct: number; // e.g. 0.95
  recoveredOpexPct: number;        // collection/ops cost, e.g. 0.18
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  growthRate: 0.3,
  churnRate: 0.08,
  grossMarginPct: 0.78,
  smPct: 0.3,
  rdPct: 0.15,
  gaPct: 0.1,
  opexPct: 0.55,
  daPct: 0.02,
  capexPct: 0.03,
  nwcPct: 0.05,
  taxRate: 0.21,
  wacc: 0.12,
  terminalGrowth: 0.03,
  years: 5,
  compMultiple: 8,
  recoveredGrossMarginPct: 0.95,
  recoveredOpexPct: 0.18,
};

export interface YearLine {
  year: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  sm: number;
  rd: number;
  ga: number;
  da: number;
  ebit: number;
  taxes: number;
  nopat: number;
  capex: number;
  deltaNwc: number;
  fcf: number;
  // Lightweight balance-sheet view:
  cash: number;        // cumulative FCF
  receivables: number; // AR ~ a fraction of revenue
}

export interface Projection {
  lines: YearLine[];
  pvFcf: number;        // sum of discounted FCF over the horizon
  pvTerminal: number;   // discounted terminal value
  enterpriseValue: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function project(
  base: number,
  a: Assumptions,
  grossMargin: number,
  opexPct: number,
  split?: { sm: number; rd: number; ga: number }
): Projection {
  const lines: YearLine[] = [];
  let cash = 0;
  let prevRevenue = base;
  const netGrowth = a.growthRate - a.churnRate;
  // Allocate opex into S&M / R&D / G&A. Without a split (recovered stream) it's all G&A.
  const total = split ? split.sm + split.rd + split.ga : 0;
  const wSm = split && total > 0 ? split.sm / total : 0;
  const wRd = split && total > 0 ? split.rd / total : 0;

  for (let t = 1; t <= a.years; t++) {
    const revenue = base * Math.pow(1 + netGrowth, t);
    const cogs = revenue * (1 - grossMargin);
    const grossProfit = revenue - cogs;
    const opex = revenue * opexPct;
    const sm = opex * wSm;
    const rd = opex * wRd;
    const ga = opex - sm - rd;
    const da = revenue * a.daPct;
    const ebit = grossProfit - opex - da;
    const taxes = Math.max(0, ebit) * a.taxRate;
    const nopat = ebit - taxes;
    const capex = revenue * a.capexPct;
    const deltaNwc = a.nwcPct * (revenue - prevRevenue);
    const fcf = nopat + da - capex - deltaNwc;
    cash += fcf;

    lines.push({
      year: t,
      revenue: r2(revenue),
      cogs: r2(cogs),
      grossProfit: r2(grossProfit),
      opex: r2(opex),
      sm: r2(sm),
      rd: r2(rd),
      ga: r2(ga),
      da: r2(da),
      ebit: r2(ebit),
      taxes: r2(taxes),
      nopat: r2(nopat),
      capex: r2(capex),
      deltaNwc: r2(deltaNwc),
      fcf: r2(fcf),
      cash: r2(cash),
      receivables: r2(revenue * 0.12),
    });
    prevRevenue = revenue;
  }

  // DCF
  let pvFcf = 0;
  lines.forEach((l) => (pvFcf += l.fcf / Math.pow(1 + a.wacc, l.year)));
  const lastFcf = lines[lines.length - 1].fcf;
  const terminalValue = (lastFcf * (1 + a.terminalGrowth)) / (a.wacc - a.terminalGrowth);
  const pvTerminal = terminalValue / Math.pow(1 + a.wacc, a.years);
  const enterpriseValue = pvFcf + pvTerminal;

  return {
    lines,
    pvFcf: r2(pvFcf),
    pvTerminal: r2(pvTerminal),
    enterpriseValue: r2(enterpriseValue),
  };
}

function addProjections(x: Projection, y: Projection): Projection {
  const lines = x.lines.map((l, i) => {
    const o = y.lines[i];
    return {
      year: l.year,
      revenue: r2(l.revenue + o.revenue),
      cogs: r2(l.cogs + o.cogs),
      grossProfit: r2(l.grossProfit + o.grossProfit),
      opex: r2(l.opex + o.opex),
      sm: r2(l.sm + o.sm),
      rd: r2(l.rd + o.rd),
      ga: r2(l.ga + o.ga),
      da: r2(l.da + o.da),
      ebit: r2(l.ebit + o.ebit),
      taxes: r2(l.taxes + o.taxes),
      nopat: r2(l.nopat + o.nopat),
      capex: r2(l.capex + o.capex),
      deltaNwc: r2(l.deltaNwc + o.deltaNwc),
      fcf: r2(l.fcf + o.fcf),
      cash: r2(l.cash + o.cash),
      receivables: r2(l.receivables + o.receivables),
    };
  });
  return {
    lines,
    pvFcf: r2(x.pvFcf + y.pvFcf),
    pvTerminal: r2(x.pvTerminal + y.pvTerminal),
    enterpriseValue: r2(x.enterpriseValue + y.enterpriseValue),
  };
}

export interface FinanceModel {
  baseline: Projection;       // company without recovered revenue
  recovered: Projection;      // the recovered stream on its own
  withRecovery: Projection;   // baseline + recovered
  evUplift: number;           // enterpriseValue delta from plugging the leak
  evMultipleBaseline: number; // DCF EV / current revenue (sanity-check multiple)
  compEv: number;             // EV implied by the peer comp multiple × revenue
  recoveredArr: number;
  paybackYears: number;       // recoveredArr is annual; EV uplift / recoveredArr
}

export function buildModel(
  baselineArr: number,
  recoveredArr: number,
  a: Assumptions = DEFAULT_ASSUMPTIONS
): FinanceModel {
  const opexTotal = a.smPct + a.rdPct + a.gaPct;
  const split = { sm: a.smPct, rd: a.rdPct, ga: a.gaPct };
  const baseline = project(baselineArr, a, a.grossMarginPct, opexTotal, split);
  const recovered = project(recoveredArr, a, a.recoveredGrossMarginPct, a.recoveredOpexPct);
  const withRecovery = addProjections(baseline, recovered);
  const evUplift = r2(withRecovery.enterpriseValue - baseline.enterpriseValue);
  return {
    baseline,
    recovered,
    withRecovery,
    evUplift,
    evMultipleBaseline: baselineArr > 0 ? r2(baseline.enterpriseValue / baselineArr) : 0,
    compEv: r2(baselineArr * a.compMultiple),
    recoveredArr,
    paybackYears: recoveredArr > 0 ? r2(evUplift / recoveredArr) : 0,
  };
}

export type PresetName = "Conservative" | "Base" | "Aggressive";

export const PRESETS: Record<PresetName, Partial<Assumptions>> = {
  Conservative: { growthRate: 0.18, churnRate: 0.12, grossMarginPct: 0.72, wacc: 0.16, terminalGrowth: 0.02, compMultiple: 5 },
  Base: { growthRate: 0.3, churnRate: 0.08, grossMarginPct: 0.78, wacc: 0.12, terminalGrowth: 0.03, compMultiple: 8 },
  Aggressive: { growthRate: 0.45, churnRate: 0.05, grossMarginPct: 0.83, wacc: 0.1, terminalGrowth: 0.04, compMultiple: 12 },
};
