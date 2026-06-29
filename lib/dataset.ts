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
const HISTORY_KEY = "metermatch:history";
const HISTORY_MAX = 12;
const EVENT = "metermatch:dataset-change";

export interface StoredDataset {
  accounts: Account[];
  name: string; // source file name / connector name
  kind: "csv" | "pdf" | "stripe" | "aws";
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
    pushHistory(d);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* quota / serialization — ignore */
  }
}

/* ----------------------------- upload history ----------------------------- */
// Every upload/scan/import is kept here so past files live in one place and can
// be re-activated later. Keyed by uploadedAt; capped to the most recent few.

export function readHistory(): StoredDataset[] {
  if (typeof window === "undefined") return [];
  try {
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as StoredDataset[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function pushHistory(d: StoredDataset): void {
  const list = readHistory().filter((x) => x.uploadedAt !== d.uploadedAt && x.name !== d.name);
  list.unshift(d);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX)));
  } catch {
    /* quota — keep fewer */
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 4)));
    } catch {
      /* give up on history */
    }
  }
}

export function removeFromHistory(uploadedAt: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(readHistory().filter((x) => x.uploadedAt !== uploadedAt)));
  window.dispatchEvent(new Event(EVENT));
}

export function activateDataset(d: StoredDataset): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(d));
  window.dispatchEvent(new Event(EVENT));
}

export function useHistory(): StoredDataset[] {
  const [list, setList] = useState<StoredDataset[]>([]);
  useEffect(() => {
    const sync = () => setList(readHistory());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
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
