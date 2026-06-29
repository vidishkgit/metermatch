"use server";

// Live Stripe importer. Runs server-side so the secret key never reaches the
// browser. Pulls subscriptions + usage + latest invoices, maps them into the
// MeterMatch account schema, and returns them to the client, which stores them as
// the active dataset (driving the whole app, same as CSV/PDF upload).

import type { Account } from "@/lib/engine";
import {
  accountFromStripe,
  periodFromInvoice,
  type SSubscription,
  type SInvoice,
  type SPrice,
} from "@/lib/stripe/map";

const API = "https://api.stripe.com/v1";

export interface StripeImportResult {
  ok: boolean;
  accounts: Account[];
  period: string;
  errors: string[];
  error?: string; // fatal error (auth, network)
}

async function sget<T>(path: string, key: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${key}`, "Stripe-Version": "2024-06-20" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || `Stripe ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function importFromStripe(apiKey: string): Promise<StripeImportResult> {
  const key = apiKey.trim();
  if (!/^(sk|rk)_(test|live)_/.test(key)) {
    return { ok: false, accounts: [], period: "", errors: [], error: "That doesn't look like a Stripe secret key (expected sk_test_… / sk_live_…)." };
  }

  try {
    // Subscriptions with customer + price expanded (max 4 expand levels, so we
    // stop at price and fetch tiers separately below).
    const subs = await sget<{ data: SSubscription[] }>(
      "/subscriptions?status=all&limit=100" +
        "&expand[]=data.customer&expand[]=data.items.data.price",
      key
    );

    if (!subs.data.length) {
      return { ok: true, accounts: [], period: "", errors: ["No subscriptions found on this Stripe account."] };
    }

    // Load tiers for tiered prices (cached by price id; tiers can't be expanded
    // inline because the path would exceed Stripe's 4-level expand limit).
    const tierCache = new Map<string, SPrice["tiers"]>();
    async function ensureTiers(price: SPrice) {
      if (price.billing_scheme !== "tiered" || price.tiers || !price.id) return;
      if (!tierCache.has(price.id)) {
        try {
          const full = await sget<SPrice>(`/prices/${price.id}?expand[]=tiers`, key);
          tierCache.set(price.id, full.tiers ?? []);
        } catch {
          tierCache.set(price.id, []);
        }
      }
      price.tiers = tierCache.get(price.id);
    }
    for (const sub of subs.data) {
      for (const it of sub.items?.data ?? []) await ensureTiers(it.price);
    }

    const accounts: Account[] = [];
    const errors: string[] = [];
    let period = "";

    for (const sub of subs.data) {
      // Latest invoice for this subscription.
      let invoice: SInvoice | null = null;
      try {
        const inv = await sget<{ data: SInvoice[] }>(`/invoices?subscription=${sub.id}&limit=1`, key);
        invoice = inv.data[0] ?? null;
      } catch {
        /* invoices optional */
      }
      if (!period) period = periodFromInvoice(invoice);

      // Usage-record summaries per metered item (legacy usage API; best-effort).
      const usageByItemId: Record<string, number> = {};
      for (const it of sub.items?.data ?? []) {
        if (it.price?.recurring?.usage_type !== "metered") continue;
        try {
          const u = await sget<{ data: { total_usage: number }[] }>(
            `/subscription_items/${it.id}/usage_record_summaries?limit=1`,
            key
          );
          if (u.data[0]) usageByItemId[it.id] = u.data[0].total_usage;
        } catch {
          /* falls back to invoice qty in the mapper */
        }
      }

      const { account, error } = accountFromStripe({ sub, usageByItemId, invoice, period: period || periodFromInvoice(invoice) });
      if (account) accounts.push(account);
      else if (error) errors.push(error);
    }

    if (!period) period = new Date().toISOString().slice(0, 7);
    return { ok: accounts.length > 0, accounts, period, errors };
  } catch (e) {
    return {
      ok: false,
      accounts: [],
      period: "",
      errors: [],
      error: e instanceof Error ? e.message : "Stripe request failed.",
    };
  }
}
