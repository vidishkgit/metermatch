import { Sidebar } from "@/components/Sidebar";
import { Topbar, type TopbarAlert } from "@/components/Topbar";
import { MobileNav } from "@/components/MobileNav";
import { DatasetBanner } from "@/components/DatasetBanner";
import { currentUser } from "@/app/actions-auth";
import { getLatestScan } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  let alerts: TopbarAlert[] = [];
  let totalAnnual = 0;
  try {
    const scan = await getLatestScan();
    totalAnnual = scan.summary.totalAnnualRecoverable;
    alerts = [...scan.findings]
      .sort((a, b) => b.annualRecoverable - a.annualRecoverable)
      .slice(0, 5)
      .map((f) => ({
        id: f.id,
        accountName: f.accountName,
        title: f.title,
        annualRecoverable: f.annualRecoverable,
        severity: f.severity,
      }));
  } catch {
    /* keep empty alerts on failure */
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 relative grain">
        <Topbar email={user?.email} alerts={alerts} totalAnnual={totalAnnual} />
        <DatasetBanner />
        <main className="px-4 md:px-8 py-7 pb-24 md:pb-7 max-w-[1400px] mx-auto">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
