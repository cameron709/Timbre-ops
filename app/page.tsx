"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, CalendarClock, CheckCircle2, ClipboardCheck } from "lucide-react";
import { AssistantBox } from "@/components/assistant-box";
import { EmptyState, Pill, Section } from "@/components/ui";
import { formatDate, formatDateTime, greeting, statusLabel } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ActivityLog, Job, JobChange, Operation } from "@/types/database";

export default function HomePage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [changes, setChanges] = useState<JobChange[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const now = new Date().toISOString();
    const [jobsResult, opsResult, changesResult, activityResult] = await Promise.all([
      supabase.from("jobs").select("*").gte("start_at", now).order("start_at", { ascending: true }).limit(6),
      supabase.from("operations").select("*").neq("status", "done").order("due_at", { ascending: true, nullsFirst: false }).limit(8),
      supabase.from("job_changes").select("*").order("created_at", { ascending: false }).limit(6),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(8)
    ]);

    setJobs(jobsResult.data ?? []);
    setOperations(opsResult.data ?? []);
    setChanges(changesResult.data ?? []);
    setActivity(activityResult.data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const needsYou = [
    ...operations.filter((operation) => operation.status === "open").slice(0, 3),
    ...changes.filter((change) => change.requires_attention).slice(0, 3)
  ].slice(0, 4);

  return (
    <main className="page">
      <section className="briefing-hero">
        <div>
          <p className="eyebrow">{formatDate(new Date().toISOString(), { weekday: "long", year: "numeric" })}</p>
          <h1>{greeting()}, Cameron</h1>
        </div>
        <AssistantBox onDone={load} />
      </section>

      <div className="dashboard-grid">
        <Section title="Needs You">
          <div className="list">
            {loading ? <EmptyState icon={ClipboardCheck} title="Checking the briefing" body="Loading live operations data." /> : null}
            {!loading && needsYou.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Nothing urgent" body="No open attention items are currently surfaced." />
            ) : null}
            {needsYou.map((item) => (
              <article className="card" key={item.id}>
                {"title" in item ? <h3>{item.title}</h3> : <h3>{item.summary}</h3>}
                <div className="card-row">
                  {"owner" in item ? <span className="meta">{item.owner ?? "Team"} {item.due_at ? `· ${formatDateTime(item.due_at)}` : ""}</span> : <span className="meta">Job change</span>}
                  {"status" in item ? <Pill tone="warn">{statusLabel(item.status)}</Pill> : <Pill tone="warn">Attention</Pill>}
                </div>
              </article>
            ))}
          </div>
        </Section>

        <Section title="Operations" action={<Link className="meta" href="/ops">Open Ops</Link>}>
          <div className="list">
            {operations.slice(0, 4).map((operation) => (
              <article className="card" key={operation.id}>
                <div className="card-row">
                  <h3>{operation.title}</h3>
                  <Pill>{operation.owner ?? "Team"}</Pill>
                </div>
                <p className="meta">{operation.due_at ? formatDateTime(operation.due_at) : "No due date"}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section title="Coming Up" action={<Link className="meta" href="/calendar">Timeline</Link>}>
          <div className="list">
            {jobs.slice(0, 4).map((job) => (
              <Link className="card" href={`/jobs/${job.id}`} key={job.id}>
                <div className="card-row">
                  <h3>{job.title}</h3>
                  <Pill tone="good">{job.readiness}%</Pill>
                </div>
                <p className="meta">{formatDateTime(job.start_at)} {job.venue ? `· ${job.venue}` : ""}</p>
              </Link>
            ))}
          </div>
        </Section>

        <Section title="What Changed">
          <div className="list">
            {changes.slice(0, 4).map((change) => (
              <article className="card" key={change.id}>
                <h3>{change.summary}</h3>
                <p className="meta">{formatDateTime(change.created_at)} · {statusLabel(change.source)}</p>
              </article>
            ))}
          </div>
        </Section>
      </div>

      <details className="activity-drawer">
        <summary>Timbre Handled</summary>
        <div className="list">
          {activity.map((item) => (
            <article className="card" key={item.id}>
              <div className="card-row">
                <h3>{item.summary}</h3>
                <Activity size={17} />
              </div>
              <p className="meta">{formatDateTime(item.created_at)} · {item.action}</p>
            </article>
          ))}
          {!activity.length ? <EmptyState icon={CalendarClock} title="No recent activity" body="Handled work will appear here as the system records it." /> : null}
        </div>
      </details>
    </main>
  );
}
