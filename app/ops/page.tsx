"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { Pill } from "@/components/ui";
import { formatOperationDue, statusLabel } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Job, Operation, OperationStatus } from "@/types/database";

type Filter = "action" | "Cameron" | "Beth" | "due" | "waiting" | "done";
type Draft = { title:string; owner:"Cameron"|"Beth"; due_precision:"none"|"date"|"timed"; due_date:string; due_at:string; notes:string; job_id:string; status:OperationStatus };
const blank: Draft = { title:"", owner:"Cameron", due_precision:"none", due_date:"", due_at:"", notes:"", job_id:"", status:"open" };

export default function OpsPage() {
  const supabase=useMemo(()=>createBrowserClient(),[]), [ops,setOps]=useState<Operation[]>([]), [jobs,setJobs]=useState<Job[]>([]);
  const [draft,setDraft]=useState<Draft>(blank), [editing,setEditing]=useState<Operation|null>(null), [filter,setFilter]=useState<Filter>("action");
  const [open,setOpen]=useState(false), [notice,setNotice]=useState(""), [openedAt]=useState(()=>Date.now());
  const load=useCallback(()=>Promise.all([
    supabase.from("operations").select("*").order("due_date",{ascending:true,nullsFirst:false}).order("due_at",{ascending:true,nullsFirst:false}),
    supabase.from("jobs").select("*").not("status","in","(closed,cancelled)").order("start_at")
  ]).then(([a,b])=>{setOps(a.data??[]);setJobs(b.data??[]);}),[supabase]);
  useEffect(()=>{load();},[load]);
  const visible=ops.filter((item)=>filter==="action"?["open","waiting"].includes(item.status):filter==="due"?item.status!=="done"&&Boolean(item.due_date||item.due_at)&&new Date(item.due_at??`${item.due_date}T12:00:00Z`).getTime()<openedAt+7*864e5:filter==="waiting"?item.status==="waiting":filter==="done"?item.status==="done":item.owner===filter);

  async function submit(event:React.FormEvent) {
    event.preventDefault(); setNotice("");
    const payload={ title:draft.title, owner:draft.owner, due_precision:draft.due_precision,
      due_date:draft.due_precision==="date"?draft.due_date||null:null,
      due_at:draft.due_precision==="timed"&&draft.due_at?new Date(draft.due_at).toISOString():null,
      notes:draft.notes||null, job_id:draft.job_id||null, status:draft.status,
      source:draft.owner==="Beth"?"beth" as const:"cameron" as const };
    const result=editing?await supabase.from("operations").update(payload).eq("id",editing.id).select().single():await supabase.from("operations").insert(payload).select().single();
    if(result.error){setNotice(result.error.message);return;}
    await supabase.from("activity_log").insert({operation_id:result.data.id,action:editing?"operation.updated":"operation.created",summary:`${result.data.title} assigned to ${result.data.owner}`,source:result.data.source,metadata:{due_precision:result.data.due_precision,due_date:result.data.due_date,due_at:result.data.due_at}});
    setDraft(blank);setEditing(null);setOpen(false);setNotice("Operation saved.");load();
  }
  function edit(item:Operation){setEditing(item);setOpen(true);setDraft({title:item.title,owner:item.owner??"Cameron",due_precision:item.due_precision,due_date:item.due_date??"",due_at:toLocal(item.due_at),notes:item.notes??"",job_id:item.job_id??"",status:item.status});}
  async function complete(item:Operation){const snapshot=item;setOps(list=>list.map(x=>x.id===item.id?{...x,status:"done"}:x));const result=await supabase.from("operations").update({status:"done"}).eq("id",item.id);if(result.error){setOps(list=>list.map(x=>x.id===snapshot.id?snapshot:x));setNotice(result.error.message);}else await supabase.from("activity_log").insert({operation_id:item.id,action:"operation.completed",summary:`Completed ${item.title}`,source:"cameron",metadata:{}});}

  return <main className="page"><header className="page-head"><div><p className="eyebrow">Business operations</p><h1>Ops</h1><p>Owned work with explicit date precision.</p></div><button className="icon-text-button" onClick={()=>{setEditing(null);setDraft(blank);setOpen(!open)}}><Plus size={17}/> New</button></header>
    <div className="filter-row scroll">{(["action","Cameron","Beth","due","waiting","done"] as Filter[]).map(item=><button className={filter===item?"active":""} onClick={()=>setFilter(item)} key={item}>{item==="action"?"Needs action":item==="due"?"Due soon":statusLabel(item)}</button>)}</div>
    {open?<form className="quick-form" onSubmit={submit}><h2>{editing?"Edit operation":"Quick entry"}</h2><label>Task<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} required/></label><div className="form-grid two"><label>Owner<select value={draft.owner} onChange={e=>setDraft({...draft,owner:e.target.value as Draft["owner"]})}><option>Cameron</option><option>Beth</option></select></label><label>Status<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as OperationStatus})}><option value="open">Open</option><option value="waiting">Waiting</option><option value="done">Done</option></select></label></div><label>Due type<select value={draft.due_precision} onChange={e=>setDraft({...draft,due_precision:e.target.value as Draft["due_precision"]})}><option value="none">No due date</option><option value="date">Date only</option><option value="timed">Date and time</option></select></label>{draft.due_precision==="date"?<label>Due date<input type="date" value={draft.due_date} onChange={e=>setDraft({...draft,due_date:e.target.value})} required/></label>:null}{draft.due_precision==="timed"?<label>Due date and time<input type="datetime-local" value={draft.due_at} onChange={e=>setDraft({...draft,due_at:e.target.value})} required/></label>:null}<label>Related job<select value={draft.job_id} onChange={e=>setDraft({...draft,job_id:e.target.value})}><option value="">General operation</option>{jobs.map(job=><option value={job.id} key={job.id}>{job.title}</option>)}</select></label><label>Notes<textarea value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label><div className="review-actions"><button type="submit">Save operation</button><button className="secondary-button" type="button" onClick={()=>setOpen(false)}>Cancel</button></div></form>:null}{notice?<p className="notice">{notice}</p>:null}
    <section className="ops-list">{visible.map(item=><article className="ops-row" key={item.id}><button className={`complete-button ${item.status==="done"?"done":""}`} aria-label={`Complete ${item.title}`} onClick={()=>complete(item)}><Check size={16}/></button><div onClick={()=>edit(item)} role="button" tabIndex={0}><div><h2>{item.title}</h2><Pill tone={item.status==="waiting"?"warn":item.status==="done"?"good":"neutral"}>{statusLabel(item.status)}</Pill></div><p>{item.owner??"Team"} · {formatOperationDue(item)}</p>{item.job_id?<Link href={`/jobs/${item.job_id}`}>{jobs.find(job=>job.id===item.job_id)?.title??"Linked job"}</Link>:null}</div></article>)}</section>
  </main>;
}
function toLocal(value:string|null){if(!value)return"";const date=new Date(value),local=new Date(date.getTime()-date.getTimezoneOffset()*60000);return local.toISOString().slice(0,16)}
