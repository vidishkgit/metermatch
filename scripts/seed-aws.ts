/**
 * Seed AWS with the MeterMatch sample dataset so a live scan reproduces the
 * verified numbers ($331,807.92/yr recoverable).
 *
 *   - Aurora (RDS Data API): plans, accounts, contracts, invoices
 *   - DynamoDB: usage events whose per-account SUM equals each account's usageCalls
 *
 * Run:  npx tsx scripts/seed-aws.ts
 * Needs env: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 *            AURORA_CLUSTER_ARN, AURORA_SECRET_ARN, AURORA_DATABASE,
 *            DYNAMO_USAGE_TABLE
 */
import "./loadenv"; // must be first: populates process.env from .env.local
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { SqlParameter } from "@aws-sdk/client-rds-data";
import { sql, p } from "../lib/aws/aurora";
import { putUsageEvents, type UsageEvent } from "../lib/aws/dynamo";
import { period, accounts } from "../lib/sampleData";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Nullable Data API params for the optional detector columns.
const nN = (name: string, v: number | undefined): SqlParameter =>
  v === undefined ? { name, value: { isNull: true } } : { name, value: { doubleValue: v } };
const nI = (name: string, v: number | undefined): SqlParameter =>
  v === undefined ? { name, value: { isNull: true } } : { name, value: { longValue: v } };
const nS = (name: string, v: string | undefined): SqlParameter =>
  v === undefined ? { name, value: { isNull: true } } : { name, value: { stringValue: v } };

async function applySchema() {
  const file = join(__dirname, "..", "aws", "schema.sql");
  const ddl = readFileSync(file, "utf8");
  const statements = ddl
    .split("\n")
    .filter((line) => !line.trim().startsWith("--")) // drop comment lines (may contain ';')
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s);
  for (const stmt of statements) await sql(stmt);
  console.log(`Applied schema (${statements.length} statements).`);
}

async function seedAurora() {
  for (const a of accounts) {
    const planId = `${a.id}_plan`;
    await sql(
      `INSERT INTO plans (id, name, base, included_calls, overage_rate)
       VALUES (:id, :name, :base, :inc, :rate)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, base = EXCLUDED.base,
         included_calls = EXCLUDED.included_calls, overage_rate = EXCLUDED.overage_rate`,
      [
        p.s("id", planId),
        p.s("name", a.plan.name),
        p.n("base", a.plan.base),
        p.i("inc", a.plan.includedCalls),
        p.n("rate", a.plan.overageRate),
      ]
    );

    await sql(
      `INSERT INTO accounts (id, name, plan_id)
       VALUES (:id, :name, :plan)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, plan_id = EXCLUDED.plan_id`,
      [p.s("id", a.id), p.s("name", a.name), p.s("plan", planId)]
    );

    await sql(
      `INSERT INTO contracts
        (account_id, rate_per_call, discount_pct, discount_ends_on,
         minimum_monthly, price_uplift_pct, status,
         upgraded_on, previous_base, fx_rate_contracted, currency, credit_balance)
       VALUES (:id, :rate, :disc, ${a.contract.discountEndsOn ? ":ends::date" : "NULL"},
         :min, :uplift, :status,
         ${a.contract.upgradedOn ? ":upgraded::date" : "NULL"}, :prevbase, :fxc, :cur, :credbal)
       ON CONFLICT (account_id) DO UPDATE SET
         rate_per_call = EXCLUDED.rate_per_call, discount_pct = EXCLUDED.discount_pct,
         discount_ends_on = EXCLUDED.discount_ends_on, minimum_monthly = EXCLUDED.minimum_monthly,
         price_uplift_pct = EXCLUDED.price_uplift_pct, status = EXCLUDED.status,
         upgraded_on = EXCLUDED.upgraded_on, previous_base = EXCLUDED.previous_base,
         fx_rate_contracted = EXCLUDED.fx_rate_contracted, currency = EXCLUDED.currency,
         credit_balance = EXCLUDED.credit_balance`,
      [
        p.s("id", a.id),
        p.n("rate", a.contract.ratePerCall),
        p.n("disc", a.contract.discountPct),
        ...(a.contract.discountEndsOn ? [p.s("ends", a.contract.discountEndsOn)] : []),
        p.n("min", a.contract.minimumMonthly),
        p.n("uplift", a.contract.priceUpliftPct),
        p.s("status", a.contract.status),
        ...(a.contract.upgradedOn ? [p.s("upgraded", a.contract.upgradedOn)] : []),
        nN("prevbase", a.contract.previousBase),
        nN("fxc", a.contract.fxRateContracted),
        nS("cur", a.contract.currency),
        nN("credbal", a.contract.creditBalance),
      ]
    );

    await sql(
      `INSERT INTO invoices
        (account_id, period, base, billed_overage_calls, billed_overage_rate,
         discount_pct_applied, payment_status,
         fx_rate_applied, foreign_subtotal, credits_applied, metered_overage_calls)
       VALUES (:id, :period, :base, :boc, :bor, :disc, :pay,
         :fxa, :foreign, :credits, :metered)
       ON CONFLICT (account_id, period) DO UPDATE SET
         base = EXCLUDED.base, billed_overage_calls = EXCLUDED.billed_overage_calls,
         billed_overage_rate = EXCLUDED.billed_overage_rate,
         discount_pct_applied = EXCLUDED.discount_pct_applied,
         payment_status = EXCLUDED.payment_status,
         fx_rate_applied = EXCLUDED.fx_rate_applied, foreign_subtotal = EXCLUDED.foreign_subtotal,
         credits_applied = EXCLUDED.credits_applied,
         metered_overage_calls = EXCLUDED.metered_overage_calls`,
      [
        p.s("id", a.id),
        p.s("period", period),
        p.n("base", a.invoice.base),
        p.i("boc", a.invoice.billedOverageCalls),
        p.n("bor", a.invoice.billedOverageRate),
        p.n("disc", a.invoice.discountPctApplied),
        p.s("pay", a.invoice.paymentStatus),
        nN("fxa", a.invoice.fxRateApplied),
        nN("foreign", a.invoice.foreignSubtotal),
        nN("credits", a.invoice.creditsApplied),
        nI("metered", a.invoice.meteredOverageCalls),
      ]
    );
  }
  console.log(`Seeded Aurora: ${accounts.length} accounts (plans, contracts, invoices).`);
}

async function seedDynamo() {
  const events: UsageEvent[] = [];
  for (const a of accounts) {
    // Split each account's total into a few events so the sum is exact but the
    // table looks like a real event stream.
    const parts = splitInto(a.usageCalls, 4);
    parts.forEach((qty, idx) => {
      events.push({
        accountId: a.id,
        period,
        eventId: `evt_${String(idx).padStart(4, "0")}`,
        metric: "api_calls",
        quantity: qty,
        ts: `${period}-15T12:0${idx}:00Z`,
      });
    });
  }
  await putUsageEvents(events);
  console.log(`Seeded DynamoDB: ${events.length} usage events.`);
}

function splitInto(total: number, n: number): number[] {
  if (total <= 0) return [0];
  const base = Math.floor(total / n);
  const parts = Array(n).fill(base);
  parts[n - 1] += total - base * n; // remainder on the last part -> exact sum
  return parts.filter((x) => x > 0);
}

async function main() {
  await applySchema();
  await seedAurora();
  await seedDynamo();
  console.log("\nDone. Set DATA_SOURCE=aws and run a scan to verify $331,807.92/yr.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
