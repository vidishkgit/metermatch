// Aurora PostgreSQL via the RDS Data API (HTTP). Stores plans, accounts,
// contracts, invoices, and persisted findings. No VPC or connection pool needed,
// which is what makes it work cleanly from Vercel's serverless functions.
import { ExecuteStatementCommand, type SqlParameter, type Field } from "@aws-sdk/client-rds-data";
import { rds, AURORA_ARN, AURORA_SECRET_ARN, AURORA_DB } from "./clients";
import type { Account } from "../engine";

type Row = Record<string, string | number | boolean | null>;

/** Run a parameterized SQL statement, returning rows as plain objects. */
export async function sql(statement: string, params: SqlParameter[] = []): Promise<Row[]> {
  const res = await rds().send(
    new ExecuteStatementCommand({
      resourceArn: AURORA_ARN,
      secretArn: AURORA_SECRET_ARN,
      database: AURORA_DB,
      sql: statement,
      parameters: params,
      includeResultMetadata: true,
    })
  );
  const cols = (res.columnMetadata ?? []).map((c) => c.name ?? "");
  return (res.records ?? []).map((rec) => {
    const row: Row = {};
    rec.forEach((field, i) => (row[cols[i]] = fieldValue(field)));
    return row;
  });
}

function fieldValue(f: Field): string | number | boolean | null {
  if (f.isNull) return null;
  if (f.stringValue !== undefined) return f.stringValue;
  if (f.longValue !== undefined) return f.longValue;
  if (f.doubleValue !== undefined) return f.doubleValue;
  if (f.booleanValue !== undefined) return f.booleanValue;
  return null;
}

// Parameter helpers for building typed Data API params.
export const p = {
  s: (name: string, value: string): SqlParameter => ({ name, value: { stringValue: value } }),
  n: (name: string, value: number): SqlParameter => ({ name, value: { doubleValue: value } }),
  i: (name: string, value: number): SqlParameter => ({ name, value: { longValue: value } }),
  b: (name: string, value: boolean): SqlParameter => ({ name, value: { booleanValue: value } }),
  nullable: (name: string, value: string | null): SqlParameter =>
    value === null ? { name, value: { isNull: true } } : { name, value: { stringValue: value } },
};

/**
 * Load billing-side account data for a period (everything except usageCalls,
 * which comes from DynamoDB). Returns Account objects with usageCalls = 0.
 */
export async function loadBillingFromAurora(period: string): Promise<Account[]> {
  const rows = await sql(
    `SELECT a.id, a.name,
            pl.id AS plan_id, pl.name AS plan_name, pl.base AS plan_base,
            pl.included_calls, pl.overage_rate,
            c.rate_per_call, c.discount_pct, c.discount_ends_on, c.minimum_monthly,
            c.price_uplift_pct, c.status,
            c.upgraded_on, c.previous_base, c.fx_rate_contracted, c.currency, c.credit_balance,
            i.base AS inv_base, i.billed_overage_calls, i.billed_overage_rate,
            i.discount_pct_applied, i.payment_status,
            i.fx_rate_applied, i.foreign_subtotal, i.credits_applied, i.metered_overage_calls
       FROM accounts a
       JOIN plans pl       ON pl.id = a.plan_id
       JOIN contracts c    ON c.account_id = a.id
       JOIN invoices i     ON i.account_id = a.id AND i.period = :period`,
    [p.s("period", period)]
  );

  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    plan: {
      id: String(r.plan_id),
      name: String(r.plan_name),
      base: Number(r.plan_base),
      includedCalls: Number(r.included_calls),
      overageRate: Number(r.overage_rate),
    },
    contract: {
      ratePerCall: Number(r.rate_per_call),
      discountPct: Number(r.discount_pct),
      discountEndsOn: r.discount_ends_on === null ? null : String(r.discount_ends_on),
      minimumMonthly: Number(r.minimum_monthly),
      priceUpliftPct: Number(r.price_uplift_pct),
      status: r.status === "trial_expired" ? "trial_expired" : "active",
      ...(r.upgraded_on !== null && { upgradedOn: String(r.upgraded_on) }),
      ...(r.previous_base !== null && { previousBase: Number(r.previous_base) }),
      ...(r.fx_rate_contracted !== null && { fxRateContracted: Number(r.fx_rate_contracted) }),
      ...(r.currency !== null && { currency: String(r.currency) }),
      ...(r.credit_balance !== null && { creditBalance: Number(r.credit_balance) }),
    },
    usageCalls: 0,
    invoice: {
      base: Number(r.inv_base),
      billedOverageCalls: Number(r.billed_overage_calls),
      billedOverageRate: Number(r.billed_overage_rate),
      discountPctApplied: Number(r.discount_pct_applied),
      paymentStatus: r.payment_status === "failed" ? "failed" : "paid",
      ...(r.fx_rate_applied !== null && { fxRateApplied: Number(r.fx_rate_applied) }),
      ...(r.foreign_subtotal !== null && { foreignSubtotal: Number(r.foreign_subtotal) }),
      ...(r.credits_applied !== null && { creditsApplied: Number(r.credits_applied) }),
      ...(r.metered_overage_calls !== null && { meteredOverageCalls: Number(r.metered_overage_calls) }),
    },
  }));
}
