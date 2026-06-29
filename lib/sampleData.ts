// MeterMatch — sample dataset for one usage-based SaaS company being audited.
// 10 curated accounts each carry one clean, explainable leak — one per detector
// (verified total: $331,807.92/yr). Plus ~50 healthy accounts so the scan looks
// realistic and the "% of ARR leaking" KPI is believable. Swap for live AWS data.
import type { Account } from "./engine";

export const period = "2026-05";

const heroAccounts: Account[] = [
  {
    id: "acc_acme",
    name: "Acme Corp",
    plan: { id: "growth", name: "Growth", base: 999, includedCalls: 1_000_000, overageRate: 0.0015 },
    contract: { ratePerCall: 0.0015, discountPct: 0, discountEndsOn: null, minimumMonthly: 999, priceUpliftPct: 0, status: "active" },
    usageCalls: 6_000_000,
    invoice: { base: 999, billedOverageCalls: 0, billedOverageRate: 0.0015, discountPctApplied: 0, paymentStatus: "paid" },
  },
  {
    id: "acc_globex",
    name: "Globex Inc",
    plan: { id: "scale", name: "Scale", base: 2999, includedCalls: 5_000_000, overageRate: 0.001 },
    contract: { ratePerCall: 0.001, discountPct: 0, discountEndsOn: null, minimumMonthly: 2999, priceUpliftPct: 0, status: "active" },
    usageCalls: 9_000_000,
    invoice: { base: 2999, billedOverageCalls: 4_000_000, billedOverageRate: 0.0005, discountPctApplied: 0, paymentStatus: "paid" },
  },
  {
    id: "acc_initech",
    name: "Initech",
    plan: { id: "scale", name: "Scale", base: 4999, includedCalls: 5_000_000, overageRate: 0.001 },
    contract: { ratePerCall: 0.001, discountPct: 10, discountEndsOn: "2026-03-31", minimumMonthly: 4999, priceUpliftPct: 0, status: "active" },
    usageCalls: 3_000_000,
    invoice: { base: 4999, billedOverageCalls: 0, billedOverageRate: 0.001, discountPctApplied: 10, paymentStatus: "paid" },
  },
  {
    id: "acc_umbrella",
    name: "Umbrella LLC",
    plan: { id: "scale", name: "Scale", base: 2999, includedCalls: 5_000_000, overageRate: 0.001 },
    contract: { ratePerCall: 0.001, discountPct: 0, discountEndsOn: null, minimumMonthly: 10_000, priceUpliftPct: 0, status: "active" },
    usageCalls: 1_200_000,
    invoice: { base: 2999, billedOverageCalls: 0, billedOverageRate: 0.001, discountPctApplied: 0, paymentStatus: "paid" },
  },
  {
    id: "acc_hooli",
    name: "Hooli",
    plan: { id: "scale", name: "Scale", base: 9990, includedCalls: 5_000_000, overageRate: 0.001 },
    contract: { ratePerCall: 0.001, discountPct: 0, discountEndsOn: null, minimumMonthly: 9990, priceUpliftPct: 15, status: "active" },
    usageCalls: 4_000_000,
    invoice: { base: 9990, billedOverageCalls: 0, billedOverageRate: 0.001, discountPctApplied: 0, paymentStatus: "paid" },
  },
  {
    id: "acc_stark",
    name: "Stark Industries",
    plan: { id: "scale", name: "Scale", base: 4999, includedCalls: 5_000_000, overageRate: 0.001 },
    contract: { ratePerCall: 0.001, discountPct: 0, discountEndsOn: null, minimumMonthly: 4999, priceUpliftPct: 0, status: "active" },
    usageCalls: 4_500_000,
    invoice: { base: 4999, billedOverageCalls: 0, billedOverageRate: 0.001, discountPctApplied: 0, paymentStatus: "failed" },
  },
  {
    // Mid-period upgrade never prorated.
    id: "acc_wayne_ent",
    name: "Wayne Enterprises",
    plan: { id: "scale", name: "Scale", base: 2999, includedCalls: 5_000_000, overageRate: 0.001 },
    contract: {
      ratePerCall: 0.001, discountPct: 0, discountEndsOn: null, minimumMonthly: 999, priceUpliftPct: 0, status: "active",
      upgradedOn: "2026-05-16", previousBase: 999,
    },
    usageCalls: 2_000_000,
    invoice: { base: 999, billedOverageCalls: 0, billedOverageRate: 0.001, discountPctApplied: 0, paymentStatus: "paid" },
  },
  {
    // EUR contract converted at a stale FX rate.
    id: "acc_eurocom",
    name: "EuroCom SA",
    plan: { id: "scale", name: "Scale", base: 8000, includedCalls: 5_000_000, overageRate: 0.001 },
    contract: {
      ratePerCall: 0.001, discountPct: 0, discountEndsOn: null, minimumMonthly: 1000, priceUpliftPct: 0, status: "active",
      currency: "EUR", fxRateContracted: 1.1,
    },
    usageCalls: 3_000_000,
    invoice: {
      base: 8000, billedOverageCalls: 0, billedOverageRate: 0.001, discountPctApplied: 0, paymentStatus: "paid",
      foreignSubtotal: 8000, fxRateApplied: 1.02,
    },
  },
  {
    // Credits applied beyond the account's actual balance.
    id: "acc_soylent_g",
    name: "Soylent Group",
    plan: { id: "growth", name: "Growth", base: 2999, includedCalls: 1_000_000, overageRate: 0.0015 },
    contract: {
      ratePerCall: 0.0015, discountPct: 0, discountEndsOn: null, minimumMonthly: 999, priceUpliftPct: 0, status: "active",
      creditBalance: 500,
    },
    usageCalls: 800_000,
    invoice: { base: 2999, billedOverageCalls: 0, billedOverageRate: 0.0015, discountPctApplied: 0, paymentStatus: "paid", creditsApplied: 2500 },
  },
  {
    // Overage metered correctly but truncated before billing.
    id: "acc_cyberdyne_x",
    name: "Cyberdyne Systems",
    plan: { id: "scale", name: "Scale", base: 4999, includedCalls: 5_000_000, overageRate: 0.001 },
    contract: { ratePerCall: 0.001, discountPct: 0, discountEndsOn: null, minimumMonthly: 4999, priceUpliftPct: 0, status: "active" },
    usageCalls: 7_480_000,
    invoice: { base: 4999, billedOverageCalls: 2_000_000, billedOverageRate: 0.001, discountPctApplied: 0, paymentStatus: "paid", meteredOverageCalls: 2_480_000 },
  },
];

// Healthy accounts — billed correctly, so the engine finds no leak. They make the
// audited population realistic (and the leakage % believable) without inflating the total.
const HEALTHY_NAMES = [
  "Northwind", "Vandelay", "Soylent", "Cyberdyne", "Tyrell Corp", "Wayne Tech",
  "Wonka Labs", "Gekko Capital", "Massive Dynamic", "Pied Piper", "Aviato", "Bluth Co",
  "Dunder Data", "Prestige Worldwide", "Sterling Cooper", "Oscorp", "Nakatomi", "Abstergo",
  "Weyland", "Virtucon", "Genco", "Bishop & Co", "Klein Cloud", "Atlas IO",
  "Helios", "Lumen Labs", "Quill", "Beacon", "Cobalt", "Driftwood",
  "Everpeak", "Flux Systems", "Granite", "Hexa", "Ionix", "Junction",
  "Kestrel", "Lattice", "Meridian", "Nimbus", "Orbital", "Pinnacle",
  "Quanta", "Riverstone", "Summit", "Talo", "Upstream", "Verdant",
  "Westgate", "Zephyr",
];

const healthyAccounts: Account[] = HEALTHY_NAMES.map((name, i) => {
  const base = [499, 999, 2999][i % 3];
  return {
    id: `acc_h${i}`,
    name,
    plan: { id: "growth", name: "Growth", base, includedCalls: 1_000_000, overageRate: 0.0015 },
    contract: { ratePerCall: 0.0015, discountPct: 0, discountEndsOn: null, minimumMonthly: base, priceUpliftPct: 0, status: "active" },
    usageCalls: 200_000 + ((i * 37_000) % 700_000), // always under quota
    invoice: { base, billedOverageCalls: 0, billedOverageRate: 0.0015, discountPctApplied: 0, paymentStatus: "paid" },
  };
});

export const accounts: Account[] = [...heroAccounts, ...healthyAccounts];
