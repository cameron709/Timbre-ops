"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { EmptyState, Pill } from "@/components/ui";
import { formatDateTime, statusLabel } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Client, Job } from "@/types/database";

export default function JobsPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filter, setFilter] = useState<"active" | "all">("active");

  useEffect(() => {
    async function load() {
      const query = supabase.from("jobs").select("*").order("start_at", { ascending: true, nullsFirst: false });
      const [jobResult, clientResult] = await Promise.all([
        filter === "active" ? query.not("status", "in", "(complete,debriefed,invoiced,closed,cancelled)") : query,
        supabase.from("clients").select("*")
      ]);
      setJobs(jobResult.data ?? []);
      setClients(clientResult.data ?? []);
    }

    load();
  }, [filter, supabase]);

  const clientById = new Map(clients.map((client) => [client.id, client]));

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Jobs</h1>
          <p>Live operational records from Supabase.</p>
        </div>
        <div className="filter-row" role="tablist" aria-label="Job filters">
          <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")} type="button">Active</button>
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")} type="button">All</button>
        </div>
      </header>

      <section className="list">
        {!jobs.length ? <EmptyState icon={ClipboardList} title="No jobs visible" body="Check authentication, RLS access, or the active filter." /> : null}
        {jobs.map((job) => (
          <Link href={`/jobs/${job.id}`} className="card" key={job.id}>
            <div className="card-row">
              <h2>{job.title}</h2>
              <Pill tone={job.status === "confirmed" || job.status === "planning" ? "good" : "neutral"}>{statusLabel(job.status)}</Pill>
            </div>
            <p className="meta">{formatDateTime(job.start_at)} {job.venue ? `· ${job.venue}` : ""}</p>
            <p className="meta">{clientById.get(job.client_id ?? "")?.name ?? "No client linked"} · readiness {job.readiness}%</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
