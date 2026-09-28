"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { EmptyState, Pill } from "@/components/ui";
import { formatDate, formatJobSchedule, formatOperationDue, statusLabel } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Job, Operation } from "@/types/database";

export default function CalendarPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);

  useEffect(() => {
    async function load() {
      const [jobResult, operationResult] = await Promise.all([
        supabase.from("jobs").select("*").or("start_at.not.is.null,start_date.not.is.null").limit(60),
        supabase.from("operations").select("*").or("due_at.not.is.null,due_date.not.is.null").neq("status", "done").limit(60)
      ]);
      const jobDate = (job: Job) => job.start_date ?? job.start_at ?? "9999-12-31";
      const operationDate = (item: Operation) => item.due_date ?? item.due_at ?? "9999-12-31";
      setJobs((jobResult.data ?? []).sort((a, b) => jobDate(a).localeCompare(jobDate(b))));
      setOperations((operationResult.data ?? []).sort((a, b) => operationDate(a).localeCompare(operationDate(b))));
    }

    load();
  }, [supabase]);

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Calendar</h1>
          <p>Jobs and operational due dates stored in Timbre Ops. Google Calendar is not connected.</p>
        </div>
      </header>

      <section className="timeline">
        {!jobs.length ? <EmptyState icon={CalendarClock} title="No dated jobs visible" body="This view uses stored job dates only; Google Calendar sync is not enabled yet." /> : null}
        {jobs.map((job) => (
          <div className="timeline-item" key={job.id}>
            <div className="timeline-date">{formatDate(job.start_at)}</div>
            <Link className="card" href={`/jobs/${job.id}`}>
              <div className="card-row">
                <h2>{job.title}</h2>
                <Pill>{statusLabel(job.status)}</Pill>
              </div>
              <p className="meta">{formatJobSchedule(job)} {job.venue ? `· ${job.venue}` : ""}</p>
            </Link>
          </div>
        ))}
      </section>
      <section className="detail-section"><h2>Operational deadlines</h2><div className="compact-list">{operations.map(item => <Link href="/ops" className="compact-row" key={item.id}><span><strong>{item.title}</strong><small>{item.owner ?? "Team"} · {formatOperationDue(item)}</small></span><Pill>{statusLabel(item.status)}</Pill></Link>)}</div></section>
    </main>
  );
}
