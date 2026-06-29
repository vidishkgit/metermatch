import type { ScanResult, Severity } from "./engine";

// A zero-valued scan, handy as a placeholder when only the override state matters.
export const emptyScan: ScanResult = {
  findings: [],
  summary: {
    accountsScanned: 0,
    accountsLeaking: 0,
    findingsCount: 0,
    totalMonthlyRecoverable: 0,
    totalAnnualRecoverable: 0,
    annualBilled: 0,
    pctOfArrLeaking: 0,
    byType: [],
  },
};

export const usd = (n: number, dp = 0) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const usd2 = (n: number) => usd(n, 2);

// Compact currency for large figures: $1.2M, $980K, $3.4B.
export const usdCompact = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

export const pct = (n: number, dp = 0) => `${(n * 100).toFixed(dp)}%`;

export const severityStyle: Record<Severity, { label: string; cls: string; dot: string }> = {
  critical: { label: "Critical", cls: "text-rose-300 bg-rose-500/10 border-rose-500/30", dot: "bg-rose-400" },
  high: { label: "High", cls: "text-orange-300 bg-orange-500/10 border-orange-500/30", dot: "bg-orange-400" },
  medium: { label: "Medium", cls: "text-amber-300 bg-amber-500/10 border-amber-500/30", dot: "bg-amber-400" },
  low: { label: "Low", cls: "text-slate-300 bg-slate-500/10 border-slate-500/30", dot: "bg-slate-400" },
};
