"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { EmptyState, Pill } from "@/components/ui";
import { formatDate, formatDateTime, statusLabel } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Job } from "@/types/database";

export default function CalendarPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("jobs").select("*").not("start_at", "is", null).order("start_at", { ascending: true }).limit(60);
      setJobs(data ?? []);
    }

    load();
  }, [supabase]);

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Calendar</h1>
          <p>Operational timeline from job dates stored in Supabase.</p>
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
              <p className="meta">{formatDateTime(job.start_at)} {job.venue ? `· ${job.venue}` : ""}</p>
            </Link>
          </div>
        ))}
      </section>
    </main>
  );
}
