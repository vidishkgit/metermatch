"use client";

// Client-side "active dataset" override.
//
// When the user uploads a CSV/PDF on Data Sources, we stash the parsed accounts
// here (localStorage). Every page (Dashboard, Findings, Accounts) then runs the
// reconciliation engine against this dataset instead of the server's live/sample
// data — so an upload drives the entire app until cleared.

import { useEffect, useState } from "react";
import { runReconciliation, type Account, type ScanResult } from "./engine";

const KEY = "metermatch:dataset";
const EVENT = "metermatch:dataset-change";

export interface StoredDataset {
  accounts: Account[];
  name: string; // source file name / connector name
  kind: "csv" | "pdf" | "stripe";
  period: string;
  uploadedAt: number;
}

export function readDataset(): StoredDataset | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as StoredDataset;
    if (!Array.isArray(d.accounts) || d.accounts.length === 0) return null;
    return d;
  } catch {
    return null;
  }
}

export function writeDataset(d: StoredDataset): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* quota / serialization — ignore */
  }
}

export function clearDataset(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

// Subscribe to dataset changes (this tab + other tabs).
export function useActiveDataset(): StoredDataset | null {
  return useDataset();
}

function useDataset(): StoredDataset | null {
  const [ds, setDs] = useState<StoredDataset | null>(null);
  useEffect(() => {
    const sync = () => setDs(readDataset());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return ds;
}

/**
 * Returns the scan to render: the uploaded dataset's scan if one is active,
 * otherwise the server-provided scan. `dataset` is non-null when an override is
 * in effect; `clear()` removes it and reverts to live/sample data.
 */
export function useActiveScan(serverScan: ScanResult): {
  scan: ScanResult;
  dataset: StoredDataset | null;
  clear: () => void;
} {
  const dataset = useDataset();
  const scan = dataset
    ? runReconciliation({ period: dataset.period, accounts: dataset.accounts })
    : serverScan;
  return { scan, dataset, clear: clearDataset };
}
