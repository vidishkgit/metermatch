import { getLatestScan } from "@/app/actions";
import { DashboardView } from "@/components/DashboardView";

export default async function DashboardPage() {
  const serverScan = await getLatestScan();
  return <DashboardView serverScan={serverScan} />;
}
