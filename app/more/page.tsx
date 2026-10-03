"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, ClipboardCheck, Settings, Settings2 } from "lucide-react";

const items = [
  { href: "/calendar", label: "Calendar", body: "Jobs and dated work", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", body: "CRM follow-ups and actions", icon: ClipboardCheck },
  { href: "/ops", label: "Ops", body: "Legacy owned operations", icon: Settings2 },
  { href: "/settings", label: "Settings", body: "Integrations and account state", icon: Settings }
];

export default function MorePage() {
  return (
    <main className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Secondary tools</p>
          <h1>More</h1>
          <p>Calendar, tasks, settings and operational utilities.</p>
        </div>
      </header>
      <section className="settings-list">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link className="settings-row" href={item.href} key={item.href}>
              <Icon size={20} />
              <span>
                <strong>{item.label}</strong>
                <small>{item.body}</small>
              </span>
              <ChevronRight size={17} />
            </Link>
          );
        })}
      </section>
    </main>
  );
}
