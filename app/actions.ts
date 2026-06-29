"use server";

import { runReconciliation, type ScanResult, type Account } from "@/lib/engine";
import { period as samplePeriod, accounts as sampleAccounts } from "@/lib/sampleData";

/**
 * Run a leakage scan.
 *
 * Data source is controlled by env:
 *   DATA_SOURCE=sample  -> bundled demo dataset (default; always works)
 *   DATA_SOURCE=aws     -> live Aurora (billing) + DynamoDB (usage)
 *
 * If AWS is selected but a live read fails, we fall back to the sample data so a
 * demo never hard-crashes.
 */
const PERIOD = process.env.SCAN_PERIOD ?? samplePeriod;

export async function runScan(): Promise<ScanResult> {
  const accounts = await loadAccounts();
  return runReconciliation({ period: PERIOD, accounts });
}

export async function getLatestScan(): Promise<ScanResult> {
  return runScan();
}

async function loadAccounts(): Promise<Account[]> {
  if (process.env.DATA_SOURCE !== "aws") return sampleAccounts;

  try {
    const { loadBillingFromAurora } = await import("@/lib/aws/aurora");
    const { usageForAccounts } = await import("@/lib/aws/dynamo");

    const billing = await loadBillingFromAurora(PERIOD);
    const usage = await usageForAccounts(
      billing.map((b) => b.id),
      PERIOD
    );
    return billing.map((b) => ({ ...b, usageCalls: usage[b.id] ?? 0 }));
  } catch (err) {
    console.error("[MeterMatch] AWS load failed, falling back to sample data:", err);
    return sampleAccounts;
  }
}
