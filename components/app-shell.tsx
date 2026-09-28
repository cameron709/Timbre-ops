"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, Home, PackageCheck, Settings2 } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/ops", label: "Ops", icon: Settings2 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/gear", label: "Gear", icon: PackageCheck }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AuthGate>
      <div className="app-shell">
        <header className="topbar">
          <Link href="/" className="wordmark" aria-label="Timbre Ops home">
            <span>Timbre</span>
            <strong>Ops</strong>
          </Link>
        </header>
        <div className="content-shell">{children}</div>
        <nav className="bottom-nav" aria-label="Primary">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </AuthGate>
  );
}
