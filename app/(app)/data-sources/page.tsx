import { ScanPanel } from "@/components/ScanPanel";
import { Integrations } from "@/components/Integrations";
import { CsvUpload } from "@/components/CsvUpload";

export default function DataSourcesPage() {
  return (
    <div className="space-y-8 py-2">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Data Sources</h1>
        <p className="text-sm text-slate-500">
          Connect your usage and billing data, then run a reconciliation scan.
        </p>
      </div>
      <ScanPanel />
      <CsvUpload />
      <Integrations />
    </div>
  );
}
