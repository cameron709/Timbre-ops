"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Search } from "lucide-react";
import { EmptyState, Pill } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { activeJobStatuses } from "@/lib/status";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Client, Contact, CrmTask, Job } from "@/types/database";

export default function ClientsPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("clients").select("*").is("archived_at", null).order("name"),
      supabase.from("contacts").select("*").is("archived_at", null).order("display_name"),
      supabase.from("jobs").select("*").is("archived_at", null),
      supabase.from("tasks").select("*").is("archived_at", null).neq("status", "Done")
    ]).then(([clientResult, contactResult, jobResult, taskResult]) => {
      setClients(clientResult.data ?? []);
      setContacts(contactResult.data ?? []);
      setJobs(jobResult.data ?? []);
      setTasks(taskResult.data ?? []);
    });
  }, [supabase]);

  const visible = clients.filter((client) => {
    const term = search.toLowerCase();
    if (!term) return true;
    return [client.name, client.email, client.domain, client.type, client.status].some((value) => value?.toLowerCase().includes(term))
      || contacts.some((contact) => contact.client_id === client.id && [contact.display_name, contact.email].some((value) => value?.toLowerCase().includes(term)));
  });

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Relationships</p>
          <h1>Clients</h1>
          <p>{visible.length} organisations and private clients.</p>
        </div>
      </header>
      <div className="search-field"><Search size={18} /><input aria-label="Search clients" placeholder="Search clients, contacts or domains" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <section className="client-list">
        {!visible.length ? <EmptyState icon={BriefcaseBusiness} title="No clients found" body="Imported Gmail client data and linked jobs will appear here." /> : null}
        {visible.map((client) => {
          const clientJobs = jobs.filter((job) => job.client_id === client.id);
          const currentJobs = clientJobs.filter((job) => activeJobStatuses.includes(job.status));
          const openTasks = tasks.filter((task) => task.client_id === client.id);
          const primary = contacts.find((contact) => contact.client_id === client.id && contact.is_primary) ?? contacts.find((contact) => contact.client_id === client.id);
          return (
            <Link href={`/clients/${client.id}`} className="client-row" key={client.id}>
              <span>
                <strong>{client.name}</strong>
                <small>{primary?.display_name ?? client.email ?? "No primary contact"} · {currentJobs.length} current · {openTasks.length} tasks</small>
                <small>{client.last_activity_at ? `Latest activity ${formatDateTime(client.last_activity_at)}` : "No activity yet"}</small>
              </span>
              <Pill tone={client.status === "Active" ? "good" : client.status === "Prospect" ? "warn" : "quiet"}>{client.status}</Pill>
              <ArrowRight size={17} />
            </Link>
          );
        })}
      </section>
    </main>
  );
}
