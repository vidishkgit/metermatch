// MeterMatch — reconciliation engine
// Pure, dependency-free. Called from a server action.

export interface Plan {
  id: string;
  name: string;
  base: number;
  includedCalls: number;
  overageRate: number;
}

export interface Contract {
  ratePerCall: number;
  discountPct: number;
  discountEndsOn: string | null;
  minimumMonthly: number;
  priceUpliftPct: number;
  status: "active" | "trial_expired";
  // --- optional, drive the extended detectors ---
  upgradedOn?: string; // YYYY-MM-DD a mid-period plan upgrade took effect
  previousBase?: number; // base $ before the upgrade
  fxRateContracted?: number; // contracted USD per 1 unit of billing currency
  currency?: string; // e.g. "EUR"
  creditBalance?: number; // credits the account is actually entitled to ($)
}

export interface Invoice {
  base: number;
  billedOverageCalls: number;
  billedOverageRate: number;
  discountPctApplied: number;
  paymentStatus: "paid" | "failed";
  // --- optional, drive the extended detectors ---
  fxRateApplied?: number; // USD per 1 unit of billing currency actually used
  foreignSubtotal?: number; // invoice subtotal in the billing currency
  creditsApplied?: number; // credits deducted on this invoice ($)
  meteredOverageCalls?: number; // true metered overage before any rounding
}

export interface Account {
  id: string;
  name: string;
  plan: Plan;
  contract: Contract;
  usageCalls: number;
  invoice: Invoice;
}

export interface AuditData {
  period: string;
  accounts: Account[];
}

export type Severity = "critical" | "high" | "medium" | "low";

export interface Finding {
  id: string;
  accountId: string;
  accountName: string;
  period: string;
  rule: string;
  title: string;
  detail: string;
  expected: number;
  billed: number;
  monthlyRecoverable: number;
  annualRecoverable: number;
  severity: Severity;
}

export interface ScanResult {
  findings: Finding[];
  summary: {
    accountsScanned: number;
    accountsLeaking: number;
    findingsCount: number;
    totalMonthlyRecoverable: number;
    totalAnnualRecoverable: number;
    annualBilled: number;
    pctOfArrLeaking: number;
    byType: { title: string; amount: number }[];
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function severity(monthly: number): Severity {
  if (monthly >= 5000) return "critical";
  if (monthly >= 1000) return "high";
  if (monthly >= 250) return "medium";
  return "low";
}

function discountExpired(end: string | null, period: string): boolean {
  if (!end) return false;
  return end.slice(0, 7) < period;
}

type RuleResult = Omit<
  Finding,
  "id" | "accountId" | "accountName" | "period" | "annualRecoverable" | "severity"
> | null;

function ruleUnderbilledOverage(acc: Account): RuleResult {
  const overageCalls = Math.max(0, acc.usageCalls - acc.plan.includedCalls);
  const expected = overageCalls * acc.contract.ratePerCall;
  const billed = acc.invoice.billedOverageCalls * acc.invoice.billedOverageRate;
  if (overageCalls > 0 && acc.invoice.billedOverageCalls === 0 && expected > 0) {
    return {
      rule: "underbilled_overage",
      title: "Under-billed overage",
      detail: `Used ${overageCalls.toLocaleString()} calls over the ${acc.plan.includedCalls.toLocaleString()} quota at $${acc.contract.ratePerCall}/call, but no overage was charged.`,
      expected: round2(expected),
      billed: round2(billed),
      monthlyRecoverable: round2(expected - billed),
    };
  }
  return null;
}

function ruleRateMismatch(acc: Account): RuleResult {
  if (acc.invoice.billedOverageCalls > 0 && acc.invoice.billedOverageRate < acc.contract.ratePerCall) {
    const calls = acc.invoice.billedOverageCalls;
    const expected = calls * acc.contract.ratePerCall;
    const billed = calls * acc.invoice.billedOverageRate;
    return {
      rule: "rate_mismatch",
      title: "Overage rate mismatch",
      detail: `Overage billed at $${acc.invoice.billedOverageRate}/call but contract rate is $${acc.contract.ratePerCall}/call across ${calls.toLocaleString()} calls.`,
      expected: round2(expected),
      billed: round2(billed),
      monthlyRecoverable: round2(expected - billed),
    };
  }
  return null;
}

function ruleExpiredDiscount(acc: Account, period: string): RuleResult {
  if (acc.invoice.discountPctApplied > 0 && discountExpired(acc.contract.discountEndsOn, period)) {
    const billedOverage = acc.invoice.billedOverageCalls * acc.invoice.billedOverageRate;
    const discounted = acc.invoice.base + billedOverage;
    const monthly = discounted * (acc.invoice.discountPctApplied / 100);
    return {
      rule: "expired_discount",
      title: "Expired discount still applied",
      detail: `A ${acc.invoice.discountPctApplied}% discount ended ${acc.contract.discountEndsOn} but is still being applied in ${period}.`,
      expected: round2(discounted),
      billed: round2(discounted - monthly),
      monthlyRecoverable: round2(monthly),
    };
  }
  return null;
}

function ruleMinimumCommitment(acc: Account): RuleResult {
  const billedOverage = acc.invoice.billedOverageCalls * acc.invoice.billedOverageRate;
  const billedTotal = acc.invoice.base + billedOverage;
  const overageCalls = Math.max(0, acc.usageCalls - acc.plan.includedCalls);
  if (
    acc.contract.minimumMonthly > billedTotal &&
    acc.invoice.paymentStatus === "paid" &&
    overageCalls === 0 &&
    acc.contract.priceUpliftPct === 0 &&
    acc.invoice.discountPctApplied === 0
  ) {
    return {
      rule: "minimum_commitment",
      title: "Missing minimum commitment",
      detail: `Contract minimum is $${acc.contract.minimumMonthly.toLocaleString()}/mo but only $${billedTotal.toLocaleString()} was billed.`,
      expected: round2(acc.contract.minimumMonthly),
      billed: round2(billedTotal),
      monthlyRecoverable: round2(acc.contract.minimumMonthly - billedTotal),
    };
  }
  return null;
}

function ruleStalePricing(acc: Account): RuleResult {
  if (acc.contract.priceUpliftPct > 0) {
    const expectedBase = acc.plan.base * (1 + acc.contract.priceUpliftPct / 100);
    if (acc.invoice.base < expectedBase - 0.01) {
      return {
        rule: "stale_pricing",
        title: "Stale pricing (uplift not applied)",
        detail: `A ${acc.contract.priceUpliftPct}% contractual price uplift was never applied; still billing the old base of $${acc.invoice.base.toLocaleString()}.`,
        expected: round2(expectedBase),
        billed: round2(acc.invoice.base),
        monthlyRecoverable: round2(expectedBase - acc.invoice.base),
      };
    }
  }
  return null;
}

function ruleFailedPayment(acc: Account): RuleResult {
  if (acc.invoice.paymentStatus === "failed") {
    const billedOverage = acc.invoice.billedOverageCalls * acc.invoice.billedOverageRate;
    const billedTotal = acc.invoice.base + billedOverage;
    const monthly = billedTotal * (1 - acc.invoice.discountPctApplied / 100);
    return {
      rule: "failed_payment",
      title: "Failed payment not recovered",
      detail: `Invoice of $${round2(monthly).toLocaleString()} was issued but payment failed and was never recovered.`,
      expected: round2(monthly),
      billed: 0,
      monthlyRecoverable: round2(monthly),
    };
  }
  return null;
}

function daysInMonth(period: string): number {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function ruleProrationGap(acc: Account, period: string): RuleResult {
  const c = acc.contract;
  if (!c.upgradedOn || c.previousBase === undefined) return null;
  if (c.upgradedOn.slice(0, 7) !== period) return null;
  const dim = daysInMonth(period);
  const day = Number(c.upgradedOn.slice(8, 10));
  const remaining = Math.max(0, dim - (day - 1));
  const uplift = acc.plan.base - c.previousBase;
  if (uplift <= 0) return null;
  const prorated = uplift * (remaining / dim);
  // Leak fires when the invoice never reflected the upgrade (still ~old base).
  if (acc.invoice.base <= c.previousBase + 0.01 && prorated > 0) {
    return {
      rule: "proration_gap",
      title: "Mid-period upgrade not prorated",
      detail: `Account upgraded on ${c.upgradedOn} (base $${c.previousBase.toLocaleString()} → $${acc.plan.base.toLocaleString()}), but the invoice still bills the old base. ${remaining} of ${dim} days went unbilled at the higher rate.`,
      expected: round2(acc.invoice.base + prorated),
      billed: round2(acc.invoice.base),
      monthlyRecoverable: round2(prorated),
    };
  }
  return null;
}

function ruleFxDrift(acc: Account): RuleResult {
  const c = acc.contract;
  const i = acc.invoice;
  if (c.fxRateContracted === undefined || i.fxRateApplied === undefined || i.foreignSubtotal === undefined) {
    return null;
  }
  if (i.fxRateApplied >= c.fxRateContracted) return null;
  const expected = i.foreignSubtotal * c.fxRateContracted;
  const billed = i.foreignSubtotal * i.fxRateApplied;
  if (expected - billed <= 0) return null;
  return {
    rule: "fx_drift",
    title: "Stale FX rate on conversion",
    detail: `Contract locks ${c.currency ?? "FX"} at $${c.fxRateContracted}/unit but the invoice converted ${i.foreignSubtotal.toLocaleString()} ${c.currency ?? ""} at a stale $${i.fxRateApplied}/unit.`,
    expected: round2(expected),
    billed: round2(billed),
    monthlyRecoverable: round2(expected - billed),
  };
}

function ruleExcessCredits(acc: Account): RuleResult {
  const c = acc.contract;
  const i = acc.invoice;
  if (i.creditsApplied === undefined || c.creditBalance === undefined) return null;
  const excess = i.creditsApplied - c.creditBalance;
  if (excess <= 0) return null;
  return {
    rule: "excess_credits",
    title: "Credits applied beyond balance",
    detail: `Invoice applied $${i.creditsApplied.toLocaleString()} in credits but the account was only entitled to $${c.creditBalance.toLocaleString()}.`,
    expected: round2(c.creditBalance),
    billed: round2(i.creditsApplied),
    monthlyRecoverable: round2(excess),
  };
}

function ruleUsageRounding(acc: Account): RuleResult {
  const i = acc.invoice;
  if (i.meteredOverageCalls === undefined) return null;
  // Rate is correct, but billed fewer overage units than actually metered (truncation).
  if (
    i.billedOverageCalls > 0 &&
    i.billedOverageRate >= acc.contract.ratePerCall - 1e-9 &&
    i.meteredOverageCalls > i.billedOverageCalls
  ) {
    const missed = i.meteredOverageCalls - i.billedOverageCalls;
    const monthly = missed * acc.contract.ratePerCall;
    if (monthly <= 0) return null;
    return {
      rule: "usage_rounding",
      title: "Usage truncated before billing",
      detail: `Metered ${i.meteredOverageCalls.toLocaleString()} overage calls but only ${i.billedOverageCalls.toLocaleString()} were billed — ${missed.toLocaleString()} calls lost to rounding/truncation.`,
      expected: round2(i.meteredOverageCalls * acc.contract.ratePerCall),
      billed: round2(i.billedOverageCalls * i.billedOverageRate),
      monthlyRecoverable: round2(monthly),
    };
  }
  return null;
}

const RULES: Array<(acc: Account, period: string) => RuleResult> = [
  ruleUnderbilledOverage,
  ruleRateMismatch,
  ruleExpiredDiscount,
  ruleMinimumCommitment,
  ruleStalePricing,
  ruleFailedPayment,
  ruleProrationGap,
  ruleFxDrift,
  ruleExcessCredits,
  ruleUsageRounding,
];

// What the account was actually invoiced this month (for ARR baseline).
function billedMonthly(acc: Account): number {
  const overage = acc.invoice.billedOverageCalls * acc.invoice.billedOverageRate;
  const subtotal = acc.invoice.base + overage;
  return subtotal * (1 - acc.invoice.discountPctApplied / 100);
}

export function runReconciliation({ period, accounts }: AuditData): ScanResult {
  const findings: Finding[] = [];
  const leakingAccounts = new Set<string>();

  for (const acc of accounts) {
    for (const rule of RULES) {
      const f = rule(acc, period);
      if (f && f.monthlyRecoverable > 0) {
        leakingAccounts.add(acc.id);
        findings.push({
          id: `${acc.id}__${f.rule}`,
          accountId: acc.id,
          accountName: acc.name,
          period,
          ...f,
          annualRecoverable: round2(f.monthlyRecoverable * 12),
          severity: severity(f.monthlyRecoverable),
        });
      }
    }
  }

  findings.sort((a, b) => b.annualRecoverable - a.annualRecoverable);

  const totalMonthly = round2(findings.reduce((s, f) => s + f.monthlyRecoverable, 0));
  const totalAnnual = round2(totalMonthly * 12);
  const annualBilled = round2(accounts.reduce((s, a) => s + billedMonthly(a), 0) * 12);
  const pctOfArr = annualBilled + totalAnnual > 0 ? round2((totalAnnual / (annualBilled + totalAnnual)) * 100) : 0;

  const byTypeMap: Record<string, number> = {};
  for (const f of findings) byTypeMap[f.title] = round2((byTypeMap[f.title] || 0) + f.annualRecoverable);
  const byType = Object.entries(byTypeMap)
    .map(([title, amount]) => ({ title, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    findings,
    summary: {
      accountsScanned: accounts.length,
      accountsLeaking: leakingAccounts.size,
      findingsCount: findings.length,
      totalMonthlyRecoverable: totalMonthly,
      totalAnnualRecoverable: totalAnnual,
      annualBilled,
      pctOfArrLeaking: pctOfArr,
      byType,
    },
  };
}
