// Pure Stripe → MeterMatch mapping. No network, no "use server" — so it can be
// unit-tested in isolation. The server action (app/actions-stripe.ts) fetches the
// raw objects and hands them here.
//
// Stripe's model doesn't map 1:1 to a usage-based contract, so we make documented
// assumptions:
//   - A subscription's licensed (flat) price  -> plan base / invoice base
//   - A subscription's metered price          -> included calls + overage rate
//   - Tiered metered price: tier with unit_amount 0 = included; first paid tier = rate
//   - Usage = Stripe usage-record summary total (fallback: invoice metered qty)
//   - Discounts = coupon percent_off on the subscription / invoice

import type { Account } from "../engine";

/* Minimal shapes of the Stripe objects we read (loosely typed on purpose). */
export interface SPrice {
  id: string;
  unit_amount: number | null;
  billing_scheme?: "per_unit" | "tiered";
  recurring?: { usage_type?: "licensed" | "metered"; interval?: string } | null;
  tiers?: { up_to: number | null; unit_amount: number | null; flat_amount: number | null }[];
}
export interface SItem {
  id: string;
  quantity?: number;
  price: SPrice;
}
export interface SSubscription {
  id: string;
  status: string;
  customer: { id: string; name?: string | null; email?: string | null } | string;
  items: { data: SItem[] };
  discount?: { coupon?: { percent_off?: number | null } | null } | null;
}
export interface SInvoiceLine {
  amount: number;
  quantity: number | null;
  price?: SPrice | null;
}
export interface SInvoice {
  paid?: boolean;
  status?: string;
  period_end?: number;
  discount?: { coupon?: { percent_off?: number | null } | null } | null;
  lines?: { data: SInvoiceLine[] };
}

const dollars = (cents: number | null | undefined): number => (cents ?? 0) / 100;
const isMetered = (p?: SPrice | null) => p?.recurring?.usage_type === "metered";
const isLicensed = (p?: SPrice | null) => p?.recurring?.usage_type === "licensed" || (!!p && !p.recurring?.usage_type && p.recurring !== null);

// included calls + per-call overage rate ($) from a (possibly tiered) metered price.
export function meteredTerms(price: SPrice): { includedCalls: number; overageRate: number } {
  if (price.billing_scheme === "tiered" && price.tiers?.length) {
    const free = price.tiers.find((t) => (t.unit_amount ?? 0) === 0 && t.up_to);
    const paid = price.tiers.find((t) => (t.unit_amount ?? 0) > 0);
    return {
      includedCalls: free?.up_to ?? 0,
      overageRate: dollars(paid?.unit_amount ?? price.tiers[price.tiers.length - 1].unit_amount),
    };
  }
  return { includedCalls: 0, overageRate: dollars(price.unit_amount) };
}

function customerName(sub: SSubscription): { id: string; name: string } {
  if (typeof sub.customer === "string") return { id: sub.customer, name: sub.customer };
  const c = sub.customer;
  return { id: c.id, name: c.name || c.email || c.id };
}

function statusToContract(status: string): Account["contract"]["status"] {
  return ["active", "trialing", "past_due"].includes(status) ? "active" : "trial_expired";
}

/**
 * Build a MeterMatch account from one subscription + its usage + latest invoice.
 * Returns null (with a reason) when the subscription has nothing usage-based to
 * reconcile.
 */
export function accountFromStripe(args: {
  sub: SSubscription;
  usageByItemId: Record<string, number>;
  invoice?: SInvoice | null;
  period: string;
}): { account: Account | null; error?: string } {
  const { sub, usageByItemId, invoice, period } = args;
  const { id, name } = customerName(sub);

  const items = sub.items?.data ?? [];
  const meteredItem = items.find((it) => isMetered(it.price));
  const licensedItem = items.find((it) => isLicensed(it.price));

  if (!meteredItem) {
    return { account: null, error: `${name}: no metered (usage-based) price — skipped.` };
  }

  const { includedCalls, overageRate } = meteredTerms(meteredItem.price);
  const base = dollars(licensedItem?.price.unit_amount) * (licensedItem?.quantity ?? 1);

  // Usage: prefer the usage-record summary; fall back to the metered invoice qty.
  let usageCalls = usageByItemId[meteredItem.id] ?? 0;

  // Invoice figures.
  const lines = invoice?.lines?.data ?? [];
  const meteredLine = lines.find((l) => isMetered(l.price));
  const licensedLine = lines.find((l) => isLicensed(l.price));
  const billedOverageCalls = meteredLine?.quantity ?? 0;
  if (usageCalls === 0 && billedOverageCalls > 0) usageCalls = billedOverageCalls;
  const billedOverageRate =
    meteredLine && meteredLine.quantity ? dollars(meteredLine.amount) / meteredLine.quantity : overageRate;
  const invBase = licensedLine ? dollars(licensedLine.amount) : base;

  const subDiscount = sub.discount?.coupon?.percent_off ?? 0;
  const invDiscount = invoice?.discount?.coupon?.percent_off ?? 0;

  const account: Account = {
    id,
    name,
    plan: {
      id: `${id}_plan`,
      name: licensedItem ? "Subscription" : "Usage-based",
      base,
      includedCalls,
      overageRate,
    },
    contract: {
      ratePerCall: overageRate,
      discountPct: subDiscount,
      discountEndsOn: null,
      minimumMonthly: 0,
      priceUpliftPct: 0,
      status: statusToContract(sub.status),
    },
    usageCalls,
    invoice: {
      base: invBase,
      billedOverageCalls,
      billedOverageRate,
      discountPctApplied: invDiscount,
      paymentStatus: invoice?.paid === false ? "failed" : "paid",
    },
  };

  return { account };
}

// Period (YYYY-MM) from an invoice period_end, else current month.
export function periodFromInvoice(inv?: SInvoice | null): string {
  const d = inv?.period_end ? new Date(inv.period_end * 1000) : new Date();
  return d.toISOString().slice(0, 7);
}
