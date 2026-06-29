import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { MobileNav } from "@/components/MobileNav";
import { DatasetBanner } from "@/components/DatasetBanner";
import { currentUser } from "@/app/actions-auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();

  // Topbar alerts/total come from the active dataset (upload / scan / import),
  // computed client-side. No dataset = empty, so the app starts clean.
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0 relative grain">
        <Topbar email={user?.email} />
        <DatasetBanner />
        <main className="px-4 md:px-8 py-7 pb-24 md:pb-7 max-w-[1400px] mx-auto">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
