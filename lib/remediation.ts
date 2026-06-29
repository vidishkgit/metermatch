// Remediation layer — turns a detected finding into an actionable fix plus
// ready-to-send artifacts (a customer email and an internal correction memo).
// Pure functions, no side effects, no money movement.

import type { Finding } from "./engine";
import { usd2 } from "./format";

export interface Remediation {
  action: string; // short imperative, e.g. "Issue a true-up invoice"
  steps: string[]; // ordered fix steps for the ops team
  email: { subject: string; body: string }; // customer-facing draft
  memo: string; // internal correction memo
  oneTime: number; // correction amount for this period ($)
}

// What the fix is, per leak type.
const PLAYBOOK: Record<string, { action: string; steps: (f: Finding, amt: string) => string[] }> = {
  underbilled_overage: {
    action: "Issue a true-up invoice for the unbilled overage",
    steps: (f, amt) => [
      `Confirm metered usage for ${f.accountName} in ${f.period} against the contract's included allowance.`,
      `Create a true-up invoice line for the unbilled overage (${amt}).`,
      "Send the corrected invoice and update the billing rule so future overage is metered automatically.",
    ],
  },
  rate_mismatch: {
    action: "Correct the overage rate and re-bill the difference",
    steps: (f, amt) => [
      `Compare the contracted overage rate with the rate applied on the ${f.period} invoice.`,
      `Re-bill the rate difference (${amt}) as an adjustment line.`,
      "Fix the rate in the billing system so it matches the contract going forward.",
    ],
  },
  expired_discount: {
    action: "Remove the expired discount and re-bill at list price",
    steps: (f, amt) => [
      `Verify the discount end date on ${f.accountName}'s contract has passed.`,
      "Remove the discount from the active subscription/price.",
      `Issue a corrected invoice for the over-discounted amount (${amt}).`,
    ],
  },
  minimum_commitment: {
    action: "Bill the shortfall to the contracted minimum",
    steps: (f, amt) => [
      `Check ${f.accountName}'s contracted monthly minimum vs. what was billed in ${f.period}.`,
      `Add a true-up line bringing the invoice up to the minimum (${amt}).`,
      "Enable automatic minimum-commitment enforcement on the plan.",
    ],
  },
  stale_pricing: {
    action: "Apply the contracted price uplift and re-bill",
    steps: (f, amt) => [
      `Confirm the agreed price uplift took effect for ${f.accountName}.`,
      "Update the base price on the subscription to the uplifted amount.",
      `Re-bill the uplift difference (${amt}) for the affected period(s).`,
    ],
  },
  failed_payment: {
    action: "Run dunning to recover the failed payment",
    steps: (f, amt) => [
      `Retry the failed charge for ${f.accountName} (${amt}).`,
      "Trigger the dunning sequence (email + retry schedule) if the retry fails.",
      "Request an updated payment method if the card is declined.",
    ],
  },
  proration_gap: {
    action: "Issue a prorated charge for the mid-period upgrade",
    steps: (f, amt) => [
      `Recompute the proration for ${f.accountName}'s mid-period upgrade.`,
      `Add the missing prorated amount (${amt}) to the next invoice.`,
      "Enable automatic proration on plan changes.",
    ],
  },
  fx_drift: {
    action: "Re-bill using the contracted FX rate",
    steps: (f, amt) => [
      `Compare the contracted FX rate with the rate applied for ${f.accountName}.`,
      `Adjust the invoice for the FX difference (${amt}).`,
      "Pin the contracted FX rate (or a refresh policy) in billing.",
    ],
  },
  excess_credits: {
    action: "Reverse the over-applied credits",
    steps: (f, amt) => [
      `Reconcile ${f.accountName}'s credit balance against credits applied in ${f.period}.`,
      `Reverse the credits applied beyond the available balance (${amt}).`,
      "Add a guardrail so credits can't exceed the balance.",
    ],
  },
  usage_rounding: {
    action: "Re-bill the truncated usage",
    steps: (f, amt) => [
      `Recompute metered usage for ${f.accountName} without truncation.`,
      `Bill the difference from rounding (${amt}).`,
      "Switch billing to round half-up (or exact) on metered usage.",
    ],
  },
};

const GENERIC = {
  action: "Review and issue a billing correction",
  steps: (f: Finding, amt: string) => [
    `Review the discrepancy for ${f.accountName} in ${f.period}.`,
    `Issue a correction for ${amt}.`,
    "Fix the underlying billing rule to prevent recurrence.",
  ],
};

export function remediate(f: Finding): Remediation {
  const oneTime = Math.max(0, f.expected - f.billed);
  const amt = usd2(oneTime);
  const play = PLAYBOOK[f.rule] ?? GENERIC;

  const email = {
    subject: `Billing correction for ${f.period} — ${f.accountName}`,
    body:
      `Hi ${f.accountName} team,\n\n` +
      `During a routine billing review we found a discrepancy on your ${f.period} invoice ` +
      `relating to "${f.title.toLowerCase()}". After reconciling your usage and contract, we'll be ` +
      `issuing a corrected invoice for ${amt}.\n\n` +
      `What happened: ${f.detail}\n\n` +
      `No action is needed on your side — the corrected invoice will follow shortly. ` +
      `If you have any questions, just reply to this email.\n\n` +
      `Thanks,\nBilling Operations`,
  };

  const memo =
    `CORRECTION MEMO\n` +
    `Account: ${f.accountName} (${f.accountId})\n` +
    `Period: ${f.period}\n` +
    `Issue: ${f.title} [${f.rule}] — ${f.severity.toUpperCase()}\n` +
    `Expected: ${usd2(f.expected)} | Billed: ${usd2(f.billed)} | Correction: ${amt}\n` +
    `Annualized recoverable: ${usd2(f.annualRecoverable)}\n` +
    `Detail: ${f.detail}\n` +
    `Recommended action: ${play.action}`;

  return { action: play.action, steps: play.steps(f, amt), email, memo, oneTime };
}
