// MeterMatch — CSV helpers (export findings, parse uploaded accounts, template).
// Pure functions; the browser-only download helper guards on `window`.

import type { Account, Finding } from "./engine";

/* ----------------------------- shared parsing ----------------------------- */

// Minimal RFC-4180-ish parser: handles quoted fields and escaped quotes.
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // ignore; handled by \n
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  // last field/row if file doesn't end in newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/* ------------------------------ export findings --------------------------- */

const FINDINGS_HEADERS = [
  "Account",
  "Account ID",
  "Leakage Type",
  "Rule",
  "Period",
  "Severity",
  "Expected",
  "Billed",
  "Monthly Recoverable",
  "Annual Recoverable",
  "Detail",
] as const;

export function findingsToCsv(findings: Finding[]): string {
  const lines = [FINDINGS_HEADERS.join(",")];
  for (const f of findings) {
    lines.push(
      [
        f.accountName,
        f.accountId,
        f.title,
        f.rule,
        f.period,
        f.severity,
        f.expected,
        f.billed,
        f.monthlyRecoverable,
        f.annualRecoverable,
        f.detail,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return lines.join("\n");
}

/* ------------------------------ download helper --------------------------- */

export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* --------------------------- parse uploaded accounts ---------------------- */

// One row per account. Required + optional (extended-detector) columns.
export const ACCOUNTS_COLUMNS = {
  required: [
    "id",
    "name",
    "planName",
    "base",
    "includedCalls",
    "overageRate",
    "ratePerCall",
    "discountPct",
    "minimumMonthly",
    "priceUpliftPct",
    "status",
    "usageCalls",
    "invBase",
    "billedOverageCalls",
    "billedOverageRate",
    "discountPctApplied",
    "paymentStatus",
  ],
  optional: [
    "discountEndsOn",
    "upgradedOn",
    "previousBase",
    "fxRateContracted",
    "currency",
    "creditBalance",
    "fxRateApplied",
    "foreignSubtotal",
    "creditsApplied",
    "meteredOverageCalls",
  ],
} as const;

export interface ParseResult {
  accounts: Account[];
  errors: string[];
  rowCount: number;
}

const num = (v: string | undefined): number => {
  if (v === undefined || v.trim() === "") return NaN;
  return Number(v.replace(/[$,\s]/g, ""));
};
const optNum = (v: string | undefined): number | undefined => {
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v.replace(/[$,\s]/g, ""));
  return Number.isNaN(n) ? undefined : n;
};
const optStr = (v: string | undefined): string | undefined => {
  const s = v?.trim();
  return s ? s : undefined;
};

export function parseAccountsCsv(text: string): ParseResult {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return { accounts: [], errors: ["The file is empty."], rowCount: 0 };

  const header = rows[0].map((h) => h.trim());
  const idx: Record<string, number> = {};
  header.forEach((h, i) => (idx[h] = i));

  const missing = ACCOUNTS_COLUMNS.required.filter((c) => !(c in idx));
  if (missing.length) {
    return {
      accounts: [],
      errors: [`Missing required column(s): ${missing.join(", ")}. Download the template to see the expected format.`],
      rowCount: rows.length - 1,
    };
  }

  const get = (row: string[], key: string) => row[idx[key]];
  const accounts: Account[] = [];
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const id = optStr(get(row, "id"));
    const name = optStr(get(row, "name"));
    if (!id || !name) {
      errors.push(`Row ${r + 1}: missing id or name — skipped.`);
      continue;
    }

    const status = (optStr(get(row, "status")) ?? "active") as Account["contract"]["status"];
    const paymentStatus = (optStr(get(row, "paymentStatus")) ?? "paid") as Account["invoice"]["paymentStatus"];

    const requiredNums: Record<string, number> = {};
    let badNum = false;
    for (const key of [
      "base",
      "includedCalls",
      "overageRate",
      "ratePerCall",
      "discountPct",
      "minimumMonthly",
      "priceUpliftPct",
      "usageCalls",
      "invBase",
      "billedOverageCalls",
      "billedOverageRate",
      "discountPctApplied",
    ]) {
      const v = num(get(row, key));
      if (Number.isNaN(v)) {
        errors.push(`Row ${r + 1} (${name}): "${key}" is not a number — skipped.`);
        badNum = true;
        break;
      }
      requiredNums[key] = v;
    }
    if (badNum) continue;

    accounts.push({
      id,
      name,
      plan: {
        id: `${id}_plan`,
        name: optStr(get(row, "planName")) ?? "Custom",
        base: requiredNums.base,
        includedCalls: requiredNums.includedCalls,
        overageRate: requiredNums.overageRate,
      },
      contract: {
        ratePerCall: requiredNums.ratePerCall,
        discountPct: requiredNums.discountPct,
        discountEndsOn: optStr(get(row, "discountEndsOn")) ?? null,
        minimumMonthly: requiredNums.minimumMonthly,
        priceUpliftPct: requiredNums.priceUpliftPct,
        status,
        upgradedOn: optStr(get(row, "upgradedOn")),
        previousBase: optNum(get(row, "previousBase")),
        fxRateContracted: optNum(get(row, "fxRateContracted")),
        currency: optStr(get(row, "currency")),
        creditBalance: optNum(get(row, "creditBalance")),
      },
      usageCalls: requiredNums.usageCalls,
      invoice: {
        base: requiredNums.invBase,
        billedOverageCalls: requiredNums.billedOverageCalls,
        billedOverageRate: requiredNums.billedOverageRate,
        discountPctApplied: requiredNums.discountPctApplied,
        paymentStatus,
        fxRateApplied: optNum(get(row, "fxRateApplied")),
        foreignSubtotal: optNum(get(row, "foreignSubtotal")),
        creditsApplied: optNum(get(row, "creditsApplied")),
        meteredOverageCalls: optNum(get(row, "meteredOverageCalls")),
      },
    });
  }

  if (accounts.length === 0 && errors.length === 0) {
    errors.push("No data rows found below the header.");
  }
  return { accounts, errors, rowCount: rows.length - 1 };
}

/* ------------------------------ CSV template ------------------------------ */

// A ready-to-fill template: header + two illustrative rows (one clean leak,
// one healthy account) so the format is self-documenting.
export function accountsTemplateCsv(): string {
  const cols = [...ACCOUNTS_COLUMNS.required, ...ACCOUNTS_COLUMNS.optional];
  const example: Record<string, string | number> = {
    id: "acc_example",
    name: "Example Corp",
    planName: "Growth",
    base: 999,
    includedCalls: 1000000,
    overageRate: 0.0015,
    ratePerCall: 0.0015,
    discountPct: 0,
    minimumMonthly: 999,
    priceUpliftPct: 0,
    status: "active",
    usageCalls: 6000000,
    invBase: 999,
    billedOverageCalls: 0,
    billedOverageRate: 0.0015,
    discountPctApplied: 0,
    paymentStatus: "paid",
    discountEndsOn: "",
    upgradedOn: "",
    previousBase: "",
    fxRateContracted: "",
    currency: "",
    creditBalance: "",
    fxRateApplied: "",
    foreignSubtotal: "",
    creditsApplied: "",
    meteredOverageCalls: "",
  };
  const healthy: Record<string, string | number> = {
    ...example,
    id: "acc_healthy",
    name: "Healthy Inc",
    usageCalls: 400000,
    invBase: 999,
  };
  const lines = [cols.join(",")];
  for (const ex of [example, healthy]) {
    lines.push(cols.map((c) => csvCell(ex[c] ?? "")).join(","));
  }
  return lines.join("\n");
}
