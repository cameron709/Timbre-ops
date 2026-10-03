"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ClipboardCheck, UserRound } from "lucide-react";
import { EmptyState, Pill, Section } from "@/components/ui";
import { formatDateOnly, formatDateTime, formatJobSchedule, statusLabel } from "@/lib/format";
import { activeJobStatuses, closedJobStatuses } from "@/lib/status";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Client, Contact, CrmActivity, CrmTask, Job } from "@/types/database";

export default function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = useMemo(() => createBrowserClient(), []);
  const [client, setClient] = useState<Client | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);

  const load = useCallback(async () => {
    const [clientResult, contactResult, jobResult, taskResult, activityResult] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("contacts").select("*").eq("client_id", id).is("archived_at", null).order("is_primary", { ascending: false }).order("display_name"),
      supabase.from("jobs").select("*").eq("client_id", id).is("archived_at", null).order("event_date", { ascending: true, nullsFirst: false }),
      supabase.from("tasks").select("*").eq("client_id", id).is("archived_at", null).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("crm_activities").select("*").eq("client_id", id).order("occurred_at", { ascending: false }).limit(20)
    ]);
    setClient(clientResult.data);
    setContacts(contactResult.data ?? []);
    setJobs(jobResult.data ?? []);
    setTasks(taskResult.data ?? []);
    setActivities(activityResult.data ?? []);
  }, [id, supabase]);

  useEffect(() => { load(); }, [load]);

  if (!client) return <main className="page"><Link className="back-link" href="/clients"><ArrowLeft size={15} /> Clients</Link><EmptyState icon={UserRound} title="Client not available" body="Check access or the client link." /></main>;

  const primary = contacts.find((contact) => contact.is_primary) ?? contacts[0];
  const openTasks = tasks.filter((task) => task.status !== "Done");
  const currentJobs = jobs.filter((job) => activeJobStatuses.includes(job.status));
  const previousJobs = jobs.filter((job) => closedJobStatuses.includes(job.status));
  const openQuotes = jobs.filter((job) => ["required", "draft", "sent"].includes(job.quote_status ?? ""));
  const outstandingInvoices = jobs.filter((job) => ["sent", "overdue"].includes(job.invoice_status ?? ""));
  const confirmedValue = jobs.reduce((sum, job) => sum + (["confirmed", "production", "completed", "invoiced", "paid"].includes(job.status) ? Number(job.quoted_value ?? 0) : 0), 0);

  return (
    <main className="page client-detail">
      <header className="job-header">
        <div>
          <Link className="back-link" href="/clients"><ArrowLeft size={15} /> Clients</Link>
          <h1>{client.name}</h1>
          <p>{client.type} · {primary?.display_name ?? "No primary contact"} · {client.last_activity_at ? `Latest ${formatDateTime(client.last_activity_at)}` : "No activity yet"}</p>
        </div>
        <Pill tone={client.status === "Active" ? "good" : client.status === "Prospect" ? "warn" : "quiet"}>{client.status}</Pill>
      </header>

      <Section title="Needs Attention" action={<Link className="section-link" href="/tasks">All tasks <ArrowRight size={14} /></Link>}>
        <div className="compact-list">
          {!openTasks.length ? <div className="clear-state"><ClipboardCheck size={20} /><div><strong>No open client tasks</strong><span>Follow-ups will appear here when created.</span></div></div> : null}
          {openTasks.slice(0, 5).map((task) => <Link className="compact-row" href="/tasks" key={task.id}><span><strong>{task.title}</strong><small>{task.due_date ? formatDateOnly(task.due_date) : "No due date"} · {task.priority}</small></span><Pill tone={task.priority === "Urgent" ? "warn" : "neutral"}>{task.status}</Pill></Link>)}
        </div>
      </Section>

      <div className="briefing-columns">
        <Section title="Current Work">{jobList(currentJobs)}</Section>
        <Section title="Contacts">
          <div className="compact-list">
            {!contacts.length ? <EmptyState icon={UserRound} title="No contacts" body="Backfilled and imported contacts will appear here." /> : null}
            {contacts.map((contact) => <Link className="compact-row" href={`/contacts/${contact.id}`} key={contact.id}><span><strong>{contact.display_name}</strong><small>{contact.job_title ?? contact.email ?? "No role recorded"}</small></span>{contact.is_primary ? <Pill tone="good">Primary</Pill> : null}</Link>)}
          </div>
        </Section>
      </div>

      <Section title="Recent Activity">
        <div className="change-stream">
          {!activities.length ? <p className="empty-inline">No relationship activity recorded yet.</p> : null}
          {activities.map((activity) => <Link href={activity.job_id ? `/jobs/${activity.job_id}?tab=activity` : `/clients/${client.id}`} key={activity.id}><span className="source-mark">{activity.activity_type[0]}</span><span><strong>{activity.subject}</strong><small>{activity.summary ?? activity.direction ?? "Relationship activity"} · {formatDateTime(activity.occurred_at)}</small></span></Link>)}
        </div>
      </Section>

      <div className="briefing-columns">
        <Section title="Previous Jobs">{jobList(previousJobs)}</Section>
        <Section title="Commercial">
          <div className="commercial-grid">
            <div><span>Open quotes</span><strong>{openQuotes.length}</strong></div>
            <div><span>Confirmed value</span><strong>{confirmedValue ? currency(confirmedValue) : "Unknown"}</strong></div>
            <div><span>Outstanding invoices</span><strong>{outstandingInvoices.length}</strong></div>
          </div>
        </Section>
      </div>

      <Section title="Notes"><p className="notes-block">{client.notes || "No persistent relationship notes yet."}</p></Section>
    </main>
  );
}

function jobList(jobs: Job[]) {
  return <div className="compact-list">{!jobs.length ? <p className="empty-inline">No jobs in this section.</p> : null}{jobs.map((job) => <Link className="compact-row" href={`/jobs/${job.id}`} key={job.id}><span><strong>{job.title}</strong><small>{formatJobSchedule(job)}{job.venue ? ` · ${job.venue}` : ""}</small></span><Pill tone={["confirmed", "production", "completed", "paid"].includes(job.status) ? "good" : "neutral"}>{statusLabel(job.status)}</Pill></Link>)}</div>;
}

function currency(value: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(value);
}
