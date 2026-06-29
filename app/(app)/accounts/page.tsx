import { getLatestScan } from "@/app/actions";
import { AccountsView } from "@/components/AccountsView";

export default async function AccountsPage() {
  const serverScan = await getLatestScan();
  return <AccountsView serverScan={serverScan} />;
}
