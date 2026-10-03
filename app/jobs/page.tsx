"use client";
import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { ArrowRight,ClipboardList,Search } from "lucide-react";
import { EmptyState,Pill } from "@/components/ui";
import { formatJobSchedule,statusLabel } from "@/lib/format";
import { calculateReadiness } from "@/lib/readiness";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Client,CrmTask,Job,JobRequirement,PackItem } from "@/types/database";

const filters=["pipeline","enquiry","quote_required","quote_sent","awaiting_client","confirmed","production","completed","invoiced","paid"] as const;
type Filter=(typeof filters)[number];
export default function JobsPage(){
 const supabase=useMemo(()=>createBrowserClient(),[]),[jobs,setJobs]=useState<Job[]>([]),[clients,setClients]=useState<Client[]>([]),[tasks,setTasks]=useState<CrmTask[]>([]),[packItems,setPackItems]=useState<PackItem[]>([]),[requirements,setRequirements]=useState<JobRequirement[]>([]),[filter,setFilter]=useState<Filter>("pipeline"),[search,setSearch]=useState("");
 useEffect(()=>{Promise.all([supabase.from("jobs").select("*").is("archived_at",null).order("event_date",{ascending:true,nullsFirst:false}),supabase.from("clients").select("*"),supabase.from("tasks").select("*").neq("status","Done"),supabase.from("pack_items").select("*"),supabase.from("job_requirements").select("*")]).then(([a,b,c,d,e])=>{setJobs(a.data??[]);setClients(b.data??[]);setTasks(c.data??[]);setPackItems(d.data??[]);setRequirements(e.data??[]);});},[supabase]);
 const visible=jobs.filter((job)=>{const q=search.toLowerCase(),matches=!q||[job.title,job.venue,clients.find(c=>c.id===job.client_id)?.name].some(v=>v?.toLowerCase().includes(q));if(!matches)return false;if(filter==="pipeline")return !["cancelled","lost"].includes(job.status);return job.status===filter;});
 const clientById=new Map(clients.map(c=>[c.id,c]));
 const nextTaskByJob=new Map(tasks.filter(task=>task.job_id).map(task=>[task.job_id!,task]));
 return <main className="page"><header className="page-head"><div><p className="eyebrow">CRM pipeline</p><h1>Jobs</h1><p>{visible.length} records in this view</p></div></header>
 <div className="search-field"><Search size={18}/><input aria-label="Search jobs" placeholder="Search jobs, clients or venues" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <div className="pipeline-snapshot">{filters.slice(1).map(stage=>{const count=jobs.filter(job=>job.status===stage).length,value=jobs.filter(job=>job.status===stage).reduce((sum,job)=>sum+Number(job.quoted_value??0),0);return <button className={filter===stage?"active":""} onClick={()=>setFilter(stage)} type="button" key={stage}><span>{statusLabel(stage)}</span><strong>{count}</strong>{value?<small>{new Intl.NumberFormat("en-AU",{style:"currency",currency:"AUD",maximumFractionDigits:0}).format(value)}</small>:null}</button>})}</div>
 <div className="filter-row scroll" role="tablist" aria-label="Job filters">{filters.map(item=><button className={filter===item?"active":""} onClick={()=>setFilter(item)} type="button" key={item}>{item==="pipeline"?"All pipeline":statusLabel(item)}</button>)}</div>
 <section className="job-list">{!visible.length?<EmptyState icon={ClipboardList} title="No matching jobs" body="Try another search or filter."/>:null}{visible.map(job=>{const readiness=calculateReadiness(job,requirements.filter(item=>item.job_id===job.id),packItems.filter(item=>item.job_id===job.id)),nextTask=nextTaskByJob.get(job.id);return <Link href={`/jobs/${job.id}`} className="job-row" key={job.id}><div className="job-date"><strong>{job.event_date?.slice(5)??job.start_date?.slice(5)??"TBC"}</strong></div><div className="job-main"><div><h2>{job.title}</h2><Pill tone={["confirmed","production","completed","paid"].includes(job.status)?"good":["quote_required","awaiting_client"].includes(job.status)?"warn":"neutral"}>{statusLabel(job.status)}</Pill></div><p>{clientById.get(job.client_id??"")?.name??"Client not linked"}{job.venue?` · ${job.venue}`:""}</p><small>{formatJobSchedule(job)}{job.quoted_value?` · ${new Intl.NumberFormat("en-AU",{style:"currency",currency:"AUD",maximumFractionDigits:0}).format(job.quoted_value)}`:""}{nextTask?` · Next: ${nextTask.title}`:readiness.blockers.length?` · Needs ${readiness.blockers.slice(0,2).join(", ")}`:" · Operationally ready"}</small></div><div className="readiness-stack"><strong>{readiness.score}%</strong><span className="mini-progress"><i style={{width:`${readiness.score}%`}}/></span><ArrowRight size={17}/></div></Link>;})}</section></main>;
}
