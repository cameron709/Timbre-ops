"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Link2, PackageCheck } from "lucide-react";
import { EmptyState, Pill, Section } from "@/components/ui";
import { formatDateTime, statusLabel } from "@/lib/format";
import { jobStatuses, packStates } from "@/lib/status";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Client, ExternalLink, Job, JobChange, PackItem } from "@/types/database";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = useMemo(() => createBrowserClient(), []);
  const [job, setJob] = useState<Job | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [changes, setChanges] = useState<JobChange[]>([]);
  const [packItems, setPackItems] = useState<PackItem[]>([]);
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [jobResult, clientResult, changeResult, packResult, linkResult] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", id).single(),
      supabase.from("clients").select("*").order("name"),
      supabase.from("job_changes").select("*").eq("job_id", id).order("created_at", { ascending: false }),
      supabase.from("pack_items").select("*").eq("job_id", id).order("created_at"),
      supabase.from("external_links").select("*").eq("job_id", id).order("created_at", { ascending: false })
    ]);

    setJob(jobResult.data ?? null);
    setClients(clientResult.data ?? []);
    setChanges(changeResult.data ?? []);
    setPackItems(packResult.data ?? []);
    setLinks(linkResult.data ?? []);
  }, [id, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job) return;
    setSaving(true);
    setNotice(null);
    const { error } = await supabase
      .from("jobs")
      .update({
        status: job.status,
        start_at: job.start_at,
        end_at: job.end_at,
        venue: job.venue,
        client_id: job.client_id,
        brief: job.brief,
        readiness: job.readiness,
        updated_at: new Date().toISOString()
      })
      .eq("id", job.id);

    if (!error) {
      await supabase.from("activity_log").insert({
        job_id: job.id,
        action: "job.updated",
        summary: `${job.title} details updated`,
        source: "cameron",
        metadata: {}
      });
    }

    setNotice(error ? error.message : "Job saved.");
    setSaving(false);
    load();
  }

  async function updatePackItem(item: PackItem, patch: Partial<PackItem>) {
    const next = { ...item, ...patch, updated_at: new Date().toISOString() };
    setPackItems((items) => items.map((candidate) => (candidate.id === item.id ? next : candidate)));
    const { error } = await supabase.from("pack_items").update(patch).eq("id", item.id);
    setNotice(error ? error.message : "Pack list saved.");
  }

  const client = clients.find((candidate) => candidate.id === job?.client_id);

  if (!job) {
    return (
      <main className="page">
        <Link className="meta" href="/jobs"><ArrowLeft size={16} /> Jobs</Link>
        <EmptyState icon={PackageCheck} title="Job not available" body="It may be hidden by RLS or the record no longer exists." />
      </main>
    );
  }

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <Link className="meta" href="/jobs">Back to jobs</Link>
          <h1>{job.title}</h1>
          <p>{formatDateTime(job.start_at)} {job.venue ? `· ${job.venue}` : ""}</p>
        </div>
        <Pill tone="good">{statusLabel(job.status)}</Pill>
      </header>

      <div className="two-col">
        <section className="detail-panel">
          <form className="form-grid" onSubmit={saveJob}>
            <div className="form-grid two">
              <label>
                Status
                <select value={job.status} onChange={(event) => setJob({ ...job, status: event.target.value as Job["status"] })}>
                  {jobStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
              </label>
              <label>
                Readiness
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={job.readiness}
                  onChange={(event) => setJob({ ...job, readiness: Number(event.target.value) })}
                />
              </label>
            </div>

            <div className="readiness" aria-label="Readiness">
              <div className="progress"><span style={{ width: `${job.readiness}%` }} /></div>
            </div>

            <div className="form-grid two">
              <label>
                Start
                <input type="datetime-local" value={toLocalInput(job.start_at)} onChange={(event) => setJob({ ...job, start_at: fromLocalInput(event.target.value) })} />
              </label>
              <label>
                End
                <input type="datetime-local" value={toLocalInput(job.end_at)} onChange={(event) => setJob({ ...job, end_at: fromLocalInput(event.target.value) })} />
              </label>
            </div>

            <label>
              Venue
              <input value={job.venue ?? ""} onChange={(event) => setJob({ ...job, venue: event.target.value })} />
            </label>

            <label>
              Client
              <select value={job.client_id ?? ""} onChange={(event) => setJob({ ...job, client_id: event.target.value || null })}>
                <option value="">No client linked</option>
                {clients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>

            <label>
              Brief
              <textarea value={job.brief ?? ""} onChange={(event) => setJob({ ...job, brief: event.target.value })} />
            </label>

            <button type="submit" disabled={saving}>{saving ? "Saving..." : "Save job"}</button>
            {notice ? <p className="form-message">{notice}</p> : null}
          </form>
        </section>

        <Section title="Pack List">
          <div className="pack-grid">
            {!packItems.length ? <EmptyState icon={PackageCheck} title="No pack items yet" body="Assistant-added or manually added pack records will appear here." /> : null}
            {packItems.map((item) => (
              <article className="pack-item" key={item.id}>
                <div className="card-row">
                  <h3>{item.item_name}</h3>
                  <select value={item.state} onChange={(event) => updatePackItem(item, { state: event.target.value as PackItem["state"] })}>
                    {packStates.map((state) => <option key={state} value={state}>{statusLabel(state)}</option>)}
                  </select>
                </div>
                <div className="quantity-grid">
                  {(["quantity_planned", "quantity_packed", "quantity_out", "quantity_returned"] as const).map((field) => (
                    <label key={field}>
                      {statusLabel(field.replace("quantity_", ""))}
                      <input
                        type="number"
                        min={0}
                        value={item[field]}
                        onChange={(event) => updatePackItem(item, { [field]: Number(event.target.value) })}
                      />
                    </label>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Section>
      </div>

      <div className="two-col">
        <Section title="Changes">
          <div className="list">
            {changes.map((change) => (
              <article className="card" key={change.id}>
                <h3>{change.summary}</h3>
                {change.detail ? <p>{change.detail}</p> : null}
                <p className="meta">{formatDateTime(change.created_at)} · {statusLabel(change.source)}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section title="Correspondence & Links">
          <div className="list">
            {client ? (
              <article className="card">
                <h3>{client.name}</h3>
                <p className="meta">{client.email ?? "No email"} {client.phone ? `· ${client.phone}` : ""}</p>
              </article>
            ) : null}
            {links.map((link) => (
              <a className="card" key={link.id} href={link.external_url ?? "#"} target="_blank" rel="noreferrer">
                <div className="card-row">
                  <h3>{statusLabel(link.provider)}</h3>
                  <Link2 size={17} />
                </div>
                <p className="meta">{link.external_id}</p>
              </a>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}
