"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, ClipboardList, Home, LogOut, MoreHorizontal, PackageCheck, Settings } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { createBrowserClient } from "@/lib/supabase/client";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/clients", label: "Clients", icon: BriefcaseBusiness },
  { href: "/gear", label: "Gear", icon: PackageCheck },
  { href: "/more", label: "More", icon: MoreHorizontal }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createBrowserClient();
  const isLocalReview = process.env.NEXT_PUBLIC_ENABLE_REVIEW_FIXTURES === "1" && pathname.startsWith("/review");
  const isPackReview = pathname === "/review/pack";

  const shell = (
      <div className={`app-shell${isPackReview ? " pack-review-shell" : ""}`}>
        <header className="topbar">
          <Link href="/" className="wordmark" aria-label="Timbre Ops home">
            <span>Timbre</span>
            <strong>Ops</strong>
          </Link>
          <div className="topbar-actions">
            <Link href="/settings" aria-label="Settings" title="Settings"><Settings size={19} /></Link>
            <button type="button" aria-label="Sign out" title="Sign out" onClick={() => supabase.auth.signOut()}><LogOut size={19} /></button>
          </div>
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
  );

  return isLocalReview ? shell : <AuthGate>{shell}</AuthGate>;
}
