"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";
import { EmptyState, Pill, Section } from "@/components/ui";
import { formatDateOnly, formatDateTime, formatJobSchedule, statusLabel } from "@/lib/format";
import { activeJobStatuses, closedJobStatuses } from "@/lib/status";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Client, Contact, CrmActivity, CrmTask, Job } from "@/types/database";

export default function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = useMemo(() => createBrowserClient(), []);
  const [contact, setContact] = useState<Contact | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);

  const load = useCallback(async () => {
    const contactResult = await supabase.from("contacts").select("*").eq("id", id).single();
    setContact(contactResult.data);
    if (!contactResult.data) return;
    const [clientResult, jobResult, taskResult, activityResult] = await Promise.all([
      supabase.from("clients").select("*").eq("id", contactResult.data.client_id).single(),
      supabase.from("jobs").select("*").eq("client_id", contactResult.data.client_id).is("archived_at", null).order("event_date", { ascending: true, nullsFirst: false }),
      supabase.from("tasks").select("*").eq("contact_id", id).is("archived_at", null).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("crm_activities").select("*").eq("contact_id", id).order("occurred_at", { ascending: false }).limit(20)
    ]);
    setClient(clientResult.data);
    setJobs(jobResult.data ?? []);
    setTasks(taskResult.data ?? []);
    setActivities(activityResult.data ?? []);
  }, [id, supabase]);

  useEffect(() => { load(); }, [load]);

  if (!contact) return <main className="page"><Link className="back-link" href="/clients"><ArrowLeft size={15} /> Clients</Link><EmptyState icon={UserRound} title="Contact not available" body="Check access or the contact link." /></main>;

  const currentJobs = jobs.filter((job) => job.primary_contact_id === contact.id || activeJobStatuses.includes(job.status));
  const previousJobs = jobs.filter((job) => closedJobStatuses.includes(job.status));

  return (
    <main className="page">
      <header className="job-header">
        <div>
          <Link className="back-link" href={client ? `/clients/${client.id}` : "/clients"}><ArrowLeft size={15} /> {client?.name ?? "Clients"}</Link>
          <h1>{contact.display_name}</h1>
          <p>{client?.name ?? "No organisation"} · {contact.job_title ?? "Role not recorded"} · {contact.email ?? "No email"}</p>
        </div>
        {contact.is_primary ? <Pill tone="good">Primary</Pill> : null}
      </header>

      <div className="briefing-columns">
        <Section title="Recent Communication">
          <div className="change-stream">
            {!activities.length ? <p className="empty-inline">No communication recorded yet.</p> : null}
            {activities.map((activity) => <Link href={activity.job_id ? `/jobs/${activity.job_id}?tab=activity` : `/contacts/${contact.id}`} key={activity.id}><span className="source-mark">{activity.activity_type[0]}</span><span><strong>{activity.subject}</strong><small>{activity.summary ?? activity.direction ?? "Activity"} · {formatDateTime(activity.occurred_at)}</small></span></Link>)}
          </div>
        </Section>
        <Section title="Tasks">
          <div className="compact-list">
            {!tasks.length ? <p className="empty-inline">No tasks for this contact.</p> : null}
            {tasks.map((task) => <Link className="compact-row" href="/tasks" key={task.id}><span><strong>{task.title}</strong><small>{task.due_date ? formatDateOnly(task.due_date) : "No due date"} · {task.priority}</small></span><Pill tone={task.status === "Done" ? "good" : task.priority === "Urgent" ? "warn" : "neutral"}>{task.status}</Pill></Link>)}
          </div>
        </Section>
      </div>

      <div className="briefing-columns">
        <Section title="Current Jobs">{jobList(currentJobs)}</Section>
        <Section title="Previous Jobs">{jobList(previousJobs)}</Section>
      </div>
      <Section title="Notes"><p className="notes-block">{contact.notes || "No contact notes yet."}</p></Section>
    </main>
  );
}

function jobList(jobs: Job[]) {
  return <div className="compact-list">{!jobs.length ? <p className="empty-inline">No jobs in this section.</p> : null}{jobs.map((job) => <Link className="compact-row" href={`/jobs/${job.id}`} key={job.id}><span><strong>{job.title}</strong><small>{formatJobSchedule(job)}{job.venue ? ` · ${job.venue}` : ""}</small></span><Pill tone={["confirmed", "production", "completed", "paid"].includes(job.status) ? "good" : "neutral"}>{statusLabel(job.status)}</Pill></Link>)}</div>;
}
