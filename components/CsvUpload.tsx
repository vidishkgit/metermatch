"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { runReconciliation, type Account, type ScanResult } from "@/lib/engine";
import { parseAccountsCsv, accountsTemplateCsv, findingsToCsv, downloadText } from "@/lib/csv";
import { parsePdfToAccounts } from "@/lib/pdfParse";
import { exportFindingsPdf } from "@/lib/pdf";
import { writeDataset, clearDataset } from "@/lib/dataset";
import { usd2, severityStyle } from "@/lib/format";
import { Upload, FileText, Download, AlertTriangle, Check, X, ArrowRight, Loader2 } from "lucide-react";

const PERIOD = "Uploaded";

export function CsvUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [applied, setApplied] = useState(false);

  function apply(accounts: Account[], name: string, kind: "csv" | "pdf") {
    setResult(runReconciliation({ period: PERIOD, accounts }));
    // Drive the entire app (Dashboard/Findings/Accounts) from this upload.
    writeDataset({ accounts, name, kind, period: PERIOD, uploadedAt: Date.now() });
    setApplied(true);
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setFileName(file.name);
    setApplied(false);
    setBusy(true);
    try {
      const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";
      const parsed = isPdf
        ? await parsePdfToAccounts(file)
        : parseAccountsCsv(await file.text());
      setErrors(parsed.errors);
      if (parsed.accounts.length > 0) {
        apply(parsed.accounts, file.name, isPdf ? "pdf" : "csv");
      } else {
        setResult(null);
      }
    } catch (e) {
      setResult(null);
      setErrors([`Couldn't read that file: ${e instanceof Error ? e.message : "unknown error"}`]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFileName(null);
    setErrors([]);
    setResult(null);
    setApplied(false);
    clearDataset(); // revert the whole app to live/sample data
    if (inputRef.current) inputRef.current.value = "";
  }

  function exportFindings() {
    if (!result || result.findings.length === 0) return;
    downloadText(`metermatch-upload-findings.csv`, findingsToCsv(result.findings));
  }

  function exportPdf() {
    if (!result || result.findings.length === 0) return;
    exportFindingsPdf(result.findings, { period: PERIOD, source: "Uploaded data" });
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Upload your own data</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            CSV or PDF, one row per account. Runs the full 10-detector scan in your browser and drives
            the whole app — nothing is uploaded.
          </p>
        </div>
        <button
          onClick={() => downloadText("metermatch-template.csv", accountsTemplateCsv())}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06] hover:border-white/20 transition"
        >
          <Download size={13} /> Template
        </button>
      </div>

      {/* Drop zone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mt-5 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center cursor-pointer transition ${
          dragging ? "border-indigo-400/60 bg-indigo-500/[0.05]" : "border-white/10 bg-white/[0.01] hover:border-white/20"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,.pdf,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="grid h-10 w-10 place-items-center rounded-full bg-indigo-500/15 text-indigo-300">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
        </div>
        <p className="text-sm text-white font-medium">
          {busy ? "Reading file…" : "Drop a CSV or PDF here, or click to browse"}
        </p>
        <p className="text-xs text-slate-500">Accounts export · UTF-8 · .csv / .pdf</p>
      </label>

      {fileName && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <FileText size={15} className="text-slate-500" /> {fileName}
          </div>
          <button onClick={reset} className="text-slate-500 hover:text-white" title="Clear">
            <X size={15} />
          </button>
        </div>
      )}

      {applied && result && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-accent-emerald/25 bg-accent-emerald/[0.07] px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-emerald-100">
            <Check size={15} className="text-accent-emerald" />
            Applied across the app — Dashboard, Findings and Accounts now reflect this file.
          </div>
          <Link
            href="/"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1 text-xs text-emerald-50 hover:bg-white/10 transition"
          >
            View dashboard <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
            <AlertTriangle size={15} /> {errors.length} issue{errors.length > 1 ? "s" : ""} found
          </div>
          <ul className="mt-2 space-y-1 text-xs text-amber-200/80 max-h-32 overflow-y-auto">
            {errors.slice(0, 12).map((e, i) => (
              <li key={i}>· {e}</li>
            ))}
            {errors.length > 12 && <li>· …and {errors.length - 12} more</li>}
          </ul>
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Accounts scanned" value={String(result.summary.accountsScanned)} />
            <Stat label="Accounts leaking" value={String(result.summary.accountsLeaking)} />
            <Stat label="Findings" value={String(result.summary.findingsCount)} />
            <Stat label="Annual recoverable" value={usd2(result.summary.totalAnnualRecoverable)} accent />
          </div>

          {result.findings.length > 0 ? (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                <p className="text-xs text-slate-400">{result.findings.length} findings</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportFindings}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06] hover:border-white/20 transition"
                  >
                    <Download size={13} /> Export CSV
                  </button>
                  <button
                    onClick={exportPdf}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.06] hover:border-white/20 transition"
                  >
                    <FileText size={13} /> Export PDF
                  </button>
                </div>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {[...result.findings]
                    .sort((a, b) => b.annualRecoverable - a.annualRecoverable)
                    .map((f) => {
                      const s = severityStyle[f.severity];
                      return (
                        <tr key={f.id} className="border-b border-white/[0.04] last:border-0">
                          <td className="px-5 py-3 text-white">{f.accountName}</td>
                          <td className="px-5 py-3 text-slate-400">{f.title}</td>
                          <td className="px-5 py-3 text-right tabular font-semibold text-accent-emerald">
                            {usd2(f.annualRecoverable)}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] ${s.cls}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-8 text-center">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-accent-emerald/15 text-accent-emerald">
                <Check size={18} />
              </div>
              <p className="text-sm text-white font-medium">No leaks detected</p>
              <p className="text-xs text-slate-500 mt-1">This dataset reconciles cleanly.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-display text-xl font-semibold tabular mt-1 ${accent ? "text-accent-emerald" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
