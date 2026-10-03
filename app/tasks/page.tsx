"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { EmptyState, Pill } from "@/components/ui";
import { formatDateOnly, statusLabel } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Client, Contact, CrmTask, Job } from "@/types/database";

type Draft = { title: string; description: string; status: CrmTask["status"]; priority: CrmTask["priority"]; due_date: string; client_id: string; contact_id: string; job_id: string };
const blank: Draft = { title: "", description: "", status: "To Do", priority: "Normal", due_date: "", client_id: "", contact_id: "", job_id: "" };

export default function TasksPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [draft, setDraft] = useState<Draft>(blank);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [taskResult, clientResult, contactResult, jobResult] = await Promise.all([
      supabase.from("tasks").select("*").is("archived_at", null).order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("clients").select("*").is("archived_at", null).order("name"),
      supabase.from("contacts").select("*").is("archived_at", null).order("display_name"),
      supabase.from("jobs").select("*").is("archived_at", null).order("event_date", { ascending: true, nullsFirst: false })
    ]);
    setTasks(taskResult.data ?? []);
    setClients(clientResult.data ?? []);
    setContacts(contactResult.data ?? []);
    setJobs(jobResult.data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await supabase.from("tasks").insert({
      title: draft.title,
      description: draft.description || null,
      status: draft.status,
      priority: draft.priority,
      due_date: draft.due_date || null,
      client_id: draft.client_id || null,
      contact_id: draft.contact_id || null,
      job_id: draft.job_id || null
    });
    setNotice(result.error?.message ?? "Task created.");
    if (!result.error) {
      setDraft(blank);
      setOpen(false);
      load();
    }
  }

  async function complete(task: CrmTask) {
    const result = await supabase.from("tasks").update({ status: "Done", completed_at: new Date().toISOString() }).eq("id", task.id);
    setNotice(result.error?.message ?? "Task completed.");
    if (!result.error) load();
  }

  const clientById = new Map(clients.map((client) => [client.id, client]));
  const jobById = new Map(jobs.map((job) => [job.id, job]));

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">CRM actions</p>
          <h1>Tasks</h1>
          <p>{tasks.filter((task) => task.status !== "Done").length} open follow-ups.</p>
        </div>
        <button className="icon-text-button" onClick={() => setOpen(!open)} type="button"><Plus size={17} /> New</button>
      </header>
      {open ? (
        <form className="quick-form" onSubmit={submit}>
          <h2>New task</h2>
          <label>Title<input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <div className="form-grid two">
            <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as CrmTask["status"] })}><option>To Do</option><option>Waiting</option><option>Done</option></select></label>
            <label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as CrmTask["priority"] })}><option>Normal</option><option>Important</option><option>Urgent</option></select></label>
          </div>
          <label>Due date<input type="date" value={draft.due_date} onChange={(event) => setDraft({ ...draft, due_date: event.target.value })} /></label>
          <div className="form-grid two">
            <label>Client<select value={draft.client_id} onChange={(event) => setDraft({ ...draft, client_id: event.target.value, contact_id: "" })}><option value="">No client</option>{clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}</select></label>
            <label>Contact<select value={draft.contact_id} onChange={(event) => setDraft({ ...draft, contact_id: event.target.value })}><option value="">No contact</option>{contacts.filter((contact) => !draft.client_id || contact.client_id === draft.client_id).map((contact) => <option value={contact.id} key={contact.id}>{contact.display_name}</option>)}</select></label>
          </div>
          <label>Job<select value={draft.job_id} onChange={(event) => setDraft({ ...draft, job_id: event.target.value })}><option value="">No job</option>{jobs.map((job) => <option value={job.id} key={job.id}>{job.title}</option>)}</select></label>
          <label>Description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <div className="review-actions"><button type="submit">Save task</button><button className="secondary-button" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      ) : null}
      {notice ? <p className="notice">{notice}</p> : null}
      <section className="ops-list">
        {!tasks.length ? <EmptyState icon={Check} title="No CRM tasks yet" body="Follow-ups from calls, emails and capture will land here." /> : null}
        {tasks.map((task) => (
          <article className="ops-row" key={task.id}>
            <button className={`complete-button ${task.status === "Done" ? "done" : ""}`} aria-label={`Complete ${task.title}`} onClick={() => complete(task)}><Check size={16} /></button>
            <div>
              <div><h2>{task.title}</h2><Pill tone={task.priority === "Urgent" ? "warn" : task.status === "Done" ? "good" : "neutral"}>{task.priority}</Pill></div>
              <p>{statusLabel(task.status)} · {task.due_date ? formatDateOnly(task.due_date) : "No due date"}</p>
              {task.client_id ? <Link href={`/clients/${task.client_id}`}>{clientById.get(task.client_id)?.name ?? "Client"}</Link> : null}
              {task.job_id ? <Link href={`/jobs/${task.job_id}`}>{jobById.get(task.job_id)?.title ?? "Job"}</Link> : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
