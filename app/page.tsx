"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Check, CheckCircle2, ClipboardCheck } from "lucide-react";
import { AssistantBox } from "@/components/assistant-box";
import { EmptyState, Pill, Section } from "@/components/ui";
import { attentionResolutionPatch } from "@/lib/attention";
import { formatDate, formatDateTime, formatJobSchedule, formatOperationDue, greeting, statusLabel } from "@/lib/format";
import { calculateReadiness } from "@/lib/readiness";
import { createBrowserClient } from "@/lib/supabase/client";
import type { ActivityLog, CrmTask, Job, JobChange, JobRequirement, Operation, PackItem } from "@/types/database";

type ChangeWithJob = JobChange & { jobs: { title: string } | null };

export default function HomePage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [jobs, setJobs] = useState<Job[]>([]), [operations, setOperations] = useState<Operation[]>([]);
  const [changes, setChanges] = useState<ChangeWithJob[]>([]), [activity, setActivity] = useState<ActivityLog[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [packItems, setPackItems] = useState<PackItem[]>([]), [requirements, setRequirements] = useState<JobRequirement[]>([]);
  const [reviewing, setReviewing] = useState(0), [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const [a,b,c,d,e,f,g] = await Promise.all([
      supabase.from("jobs").select("*").not("status", "in", "(closed,cancelled)").order("start_at", { ascending: true, nullsFirst: false }).limit(8),
      supabase.from("operations").select("*").in("status", ["open", "waiting"]).order("due_at", { ascending: true, nullsFirst: false }).limit(8),
      supabase.from("job_changes").select("*,jobs(title)").order("created_at", { ascending: false }).limit(12),
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(10),
      supabase.from("pack_items").select("*"),
      supabase.from("job_requirements").select("*"),
      supabase.from("tasks").select("*").is("archived_at", null).neq("status", "Done").order("due_date", { ascending: true, nullsFirst: false }).limit(8)
    ]);
    setJobs(a.data ?? []); setOperations(b.data ?? []); setChanges((c.data ?? []) as unknown as ChangeWithJob[]); setActivity(d.data ?? []); setPackItems(e.data ?? []); setRequirements(f.data ?? []); setTasks(g.data ?? []); setLoading(false);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);
  const needsYou = changes.filter((change) => change.requires_attention && !change.resolved_at), current = needsYou[reviewing];
  async function resolve(change: ChangeWithJob) {
    if (!resolution.trim()) return;
    const { data } = await supabase.auth.getUser();
    await supabase.from("job_changes").update(attentionResolutionPatch(resolution, data.user?.id ?? null)).eq("id", change.id);
    await supabase.from("activity_log").insert({ job_id: change.job_id, action: "attention.resolved", summary: `Reviewed: ${change.summary}`, source: "cameron", metadata: {} });
    setReviewing(0); setResolution(""); load();
  }
  return <main className="page briefing-page">
    <section className="briefing-hero"><div><p className="eyebrow">{formatDate(new Date().toISOString(), { weekday: "long", year: "numeric" })}</p><h1>{greeting()}, Cameron</h1><p className="lede">Here is what needs attention across Timbre.</p></div><AssistantBox onDone={load} /></section>
    <Section title="Needs You" action={needsYou.length ? <button className="text-action" onClick={() => setReviewing(0)} type="button">Take me through them <ArrowRight size={15}/></button> : undefined}>
      {loading ? <EmptyState icon={ClipboardCheck} title="Checking the briefing" body="Loading live operational context." /> : null}
      {!loading && !needsYou.length && !tasks.length ? <div className="clear-state"><CheckCircle2 size={20}/><div><strong>Nothing needs a decision</strong><span>Changes and tasks are still visible below.</span></div></div> : null}
      <div className="attention-list">{needsYou.slice(0,3).map((change)=><Link className="attention-row" href={`/jobs/${change.job_id}?tab=changes`} key={change.id}><span className="attention-dot"/><span><strong>{change.summary}</strong><small>{change.jobs?.title ?? "Job"} · {statusLabel(change.source)}</small></span><ArrowRight size={17}/></Link>)}</div>
      <div className="attention-list">{tasks.slice(0,3).map((task)=><Link className="attention-row" href="/tasks" key={task.id}><span className="attention-dot"/><span><strong>{task.title}</strong><small>{task.priority} · {task.due_date ? formatDate(task.due_date) : "No due date"}</small></span><ArrowRight size={17}/></Link>)}</div>
    </Section>
    {current ? <section className="review-panel"><p className="eyebrow">Attention {reviewing+1} of {needsYou.length}</p><h2>{current.summary}</h2><p>{current.detail}</p><p className="meta">{current.jobs?.title} · via {statusLabel(current.source)}</p><label>Resolution / remaining follow-up<input value={resolution} onChange={event=>setResolution(event.target.value)} placeholder="What was decided or still needs doing?"/></label><div className="review-actions"><Link className="secondary-button" href={`/jobs/${current.job_id}?tab=changes`}>Open job</Link><button onClick={()=>resolve(current)} disabled={!resolution.trim()} type="button"><Check size={16}/> Mark reviewed</button>{reviewing < needsYou.length-1 ? <button className="secondary-button" onClick={()=>{setReviewing(reviewing+1);setResolution("")}} type="button">Next</button>:null}</div></section>:null}
    <div className="briefing-columns">
      <Section title="Operations" action={<Link className="section-link" href="/ops">All Ops <ArrowRight size={14}/></Link>}><div className="compact-list">{operations.slice(0,4).map((item)=><Link href="/ops" className="compact-row" key={item.id}><span><strong>{item.title}</strong><small>{item.owner ?? "Team"} · {formatOperationDue(item)}</small></span><Pill tone={item.status === "waiting" ? "warn":"neutral"}>{statusLabel(item.status)}</Pill></Link>)}</div></Section>
      <Section title="Coming Up" action={<Link className="section-link" href="/calendar">Timeline <ArrowRight size={14}/></Link>}><div className="compact-list">{jobs.slice(0,5).map((job)=>{const readiness=calculateReadiness(job,requirements.filter(item=>item.job_id===job.id),packItems.filter(item=>item.job_id===job.id));return <Link href={`/jobs/${job.id}`} className="compact-row" key={job.id}><span><strong>{job.title}</strong><small>{formatJobSchedule(job)}{job.venue ? ` · ${job.venue}`:""}</small></span><span className="readiness-number" title={readiness.blockers.join(", ")}>{readiness.score}%</span></Link>})}</div></Section>
    </div>
    <Section title="Pipeline Snapshot"><div className="pipeline-snapshot dashboard">{["enquiry","quote_sent","awaiting_client","confirmed"].map(stage=><Link href={`/jobs`} key={stage}><span>{statusLabel(stage)}</span><strong>{jobs.filter(job=>job.status===stage).length}</strong></Link>)}</div></Section>
    <Section title="What Changed"><div className="change-stream">{changes.slice(0,6).map((change)=><Link href={`/jobs/${change.job_id}?tab=changes`} key={change.id}><span className="source-mark">{change.source[0].toUpperCase()}</span><span><strong>{change.summary}</strong><small>{change.jobs?.title ?? "Job"} · {formatDateTime(change.created_at)}</small></span></Link>)}</div></Section>
    <details className="activity-drawer"><summary><span><Activity size={17}/> Timbre Handled</span><small>{activity.length} recent actions</small></summary><div className="compact-list">{activity.map((item)=><div className="compact-row" key={item.id}><span><strong>{item.summary}</strong><small>{formatDateTime(item.created_at)} · {item.action}</small></span></div>)}</div></details>
  </main>;
}
