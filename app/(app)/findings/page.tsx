import { getLatestScan } from "@/app/actions";
import { FindingsView } from "@/components/FindingsView";

export default async function FindingsPage() {
  const serverScan = await getLatestScan();
  return <FindingsView serverScan={serverScan} />;
}
