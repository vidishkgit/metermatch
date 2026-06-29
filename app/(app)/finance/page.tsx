import { getLatestScan } from "@/app/actions";
import { FinanceView } from "@/components/FinanceView";

export default async function FinancePage() {
  const serverScan = await getLatestScan();
  return <FinanceView serverScan={serverScan} />;
}
