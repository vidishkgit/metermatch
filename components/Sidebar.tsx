"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Users, LineChart, Database, Tag } from "lucide-react";
import { MeterMark } from "./MeterMark";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/findings", label: "Findings", icon: Search },
  { href: "/accounts", label: "Accounts", icon: Users },
  { href: "/finance", label: "Financial Impact", icon: LineChart },
  { href: "/data-sources", label: "Data Sources", icon: Database },
  { href: "/pricing", label: "Pricing", icon: Tag },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-[248px] shrink-0 border-r border-white/[0.06] bg-ink-950/60 backdrop-blur-xl px-4 py-6 hidden md:flex flex-col">
      <Link href="/" className="flex items-center gap-2.5 px-2 mb-8">
        <MeterMark />
        <span className="font-display text-lg font-semibold tracking-tight">MeterMatch</span>
      </Link>

      <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.15em] text-slate-500">OVERVIEW</p>
      <nav className="flex flex-col gap-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-white/[0.06] text-white border border-white/10"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.03] border border-transparent"
              }`}
            >
              <Icon size={18} className={active ? "text-indigo-400" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
        <p className="text-xs text-slate-300 font-medium">Live revenue recovery</p>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
          Usage events on DynamoDB · billing ledger on Aurora.
        </p>
      </div>
    </aside>
  );
}
