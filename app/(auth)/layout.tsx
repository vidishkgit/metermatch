import Link from "next/link";
import { MeterMark } from "@/components/MeterMark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen grain overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-indigo-500/[0.09] blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-accent-teal/[0.05] blur-[120px]" />

      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
        <Link href="/" className="flex items-center gap-2">
          <MeterMark />
          <span className="font-display text-base font-semibold tracking-tight">MeterMatch</span>
        </Link>
        <span className="text-xs text-slate-500">Revenue-leakage detection</span>
      </header>

      <main className="relative z-10 flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
    </div>
  );
}
