"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Users, LineChart, Database } from "lucide-react";

const nav = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/findings", label: "Findings", icon: Search },
  { href: "/accounts", label: "Accounts", icon: Users },
  { href: "/finance", label: "Impact", icon: LineChart },
  { href: "/data-sources", label: "Scan", icon: Database },
];

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/[0.08] bg-ink-950/80 backdrop-blur-xl">
      <div className="flex items-stretch justify-around">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] ${
                active ? "text-indigo-400" : "text-slate-500"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
