"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, CalendarDays, CheckCheck, ClipboardList, Home, LogOut, MoreHorizontal, PackageCheck, Settings, UserRound } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { BrandMark } from "@/components/brand-mark";
import { createBrowserClient } from "@/lib/supabase/client";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/clients", label: "Clients", icon: BriefcaseBusiness },
  { href: "/gear", label: "Gear", icon: PackageCheck },
  { href: "/more", label: "More", icon: MoreHorizontal }
];
const workspaceNav = [
  { href: "/tasks", label: "Tasks", icon: CheckCheck },
  { href: "/ops", label: "Operations", icon: ClipboardList },
  { href: "/calendar", label: "Calendar", icon: CalendarDays }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const supabase = createBrowserClient();
  const isLocalReview = process.env.NEXT_PUBLIC_ENABLE_REVIEW_FIXTURES === "1" && pathname.startsWith("/review");
  const isPackReview = pathname === "/review/pack";
  const isActive = (href: string) => href === "/" ? pathname === "/" : href === "/more" ? ["/more", "/tasks", "/ops", "/calendar", "/settings"].some(path => pathname.startsWith(path)) : pathname.startsWith(href);
  const shell = <div className={`app-shell${isPackReview ? " pack-review-shell" : ""}`}>
    <a href="#workspace" className="skip-link">Skip to workspace</a>
    <header className="topbar">
      <Link href="/" className="brand-link topbar-brand" aria-label="Timbre Ops home"><BrandMark /></Link>
      <span className="shell-caption">Production workspace</span>
      <details className="account-menu"><summary aria-label="Account menu"><UserRound size={19}/><span>Cameron</span></summary><div className="account-popover"><Link href="/settings"><Settings size={18}/> Settings</Link><button type="button" onClick={() => supabase.auth.signOut()}><LogOut size={18}/> Sign out</button></div></details>
    </header>
    <aside className="sidebar" aria-label="Workspace navigation">
      <Link href="/" className="brand-link sidebar-brand" aria-label="Timbre Ops home"><BrandMark /></Link>
      <p className="sidebar-caption">Production workspace</p>
      <nav aria-label="Primary sidebar">{nav.filter(item => item.href !== "/more").map(item => { const Icon = item.icon; const active = isActive(item.href); return <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><Icon size={19}/>{item.label}</Link>; })}</nav>
      <nav className="workspace-nav" aria-label="Operations">{workspaceNav.map(item => { const Icon = item.icon; const active = pathname.startsWith(item.href); return <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><Icon size={19}/>{item.label}</Link>; })}<Link href="/more" className={pathname === "/more" ? "active" : ""}><MoreHorizontal size={19}/> More</Link></nav>
      <div className="sidebar-footer"><span>Timbre Pro Audio</span><small>Hear the Difference</small></div>
    </aside>
    <div className="content-shell" id="workspace" tabIndex={-1}>{children}</div>
    <nav className="bottom-nav" aria-label="Primary">{nav.map(item => { const Icon = item.icon; const active = isActive(item.href); return <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><Icon size={20}/><span>{item.label}</span></Link>; })}</nav>
  </div>;
  return isLocalReview ? shell : <AuthGate>{shell}</AuthGate>;
}
