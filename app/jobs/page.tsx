"use client";
import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { ArrowRight,ClipboardList,Search } from "lucide-react";
import { EmptyState,Pill } from "@/components/ui";
import { formatJobSchedule,statusLabel } from "@/lib/format";
import { calculateReadiness } from "@/lib/readiness";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Client,Job,JobRequirement,PackItem } from "@/types/database";

const filters=["active","upcoming","enquiries","quoting","confirmed","planning","complete"] as const;
type Filter=(typeof filters)[number];
export default function JobsPage(){
 const supabase=useMemo(()=>createBrowserClient(),[]),[jobs,setJobs]=useState<Job[]>([]),[clients,setClients]=useState<Client[]>([]),[packItems,setPackItems]=useState<PackItem[]>([]),[requirements,setRequirements]=useState<JobRequirement[]>([]),[filter,setFilter]=useState<Filter>("active"),[search,setSearch]=useState("");
 useEffect(()=>{Promise.all([supabase.from("jobs").select("*").order("start_at",{ascending:true,nullsFirst:false}),supabase.from("clients").select("*"),supabase.from("pack_items").select("*"),supabase.from("job_requirements").select("*")]).then(([a,b,c,d])=>{setJobs(a.data??[]);setClients(b.data??[]);setPackItems(c.data??[]);setRequirements(d.data??[]);});},[supabase]);
 const visible=jobs.filter((job)=>{const q=search.toLowerCase(),matches=!q||[job.title,job.venue,clients.find(c=>c.id===job.client_id)?.name].some(v=>v?.toLowerCase().includes(q));if(!matches)return false;if(filter==="active")return !["complete","debriefed","invoiced","closed","cancelled"].includes(job.status);if(filter==="upcoming")return Boolean(job.start_at&&new Date(job.start_at)>=new Date());if(filter==="enquiries")return ["enquiry","assessing","site_discovery"].includes(job.status);if(filter==="quoting")return ["quoting","quote_sent"].includes(job.status);if(filter==="confirmed")return job.status==="confirmed";if(filter==="planning")return ["planning","ready_to_pack","packed","on_site"].includes(job.status);return ["complete","debriefed","invoiced","closed"].includes(job.status);});
 const clientById=new Map(clients.map(c=>[c.id,c]));
 return <main className="page"><header className="page-head"><div><p className="eyebrow">Operational source of truth</p><h1>Jobs</h1><p>{visible.length} records in this view</p></div></header>
 <div className="search-field"><Search size={18}/><input aria-label="Search jobs" placeholder="Search jobs, clients or venues" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <div className="filter-row scroll" role="tablist" aria-label="Job filters">{filters.map(item=><button className={filter===item?"active":""} onClick={()=>setFilter(item)} type="button" key={item}>{statusLabel(item)}</button>)}</div>
 <section className="job-list">{!visible.length?<EmptyState icon={ClipboardList} title="No matching jobs" body="Try another search or filter."/>:null}{visible.map(job=>{const readiness=calculateReadiness(job,requirements.filter(item=>item.job_id===job.id),packItems.filter(item=>item.job_id===job.id));return <Link href={`/jobs/${job.id}`} className="job-row" key={job.id}><div className="job-date"><strong>{job.start_date?.slice(5)??"TBC"}</strong></div><div className="job-main"><div><h2>{job.title}</h2><Pill tone={["confirmed","planning","ready_to_pack"].includes(job.status)?"good":"neutral"}>{statusLabel(job.status)}</Pill></div><p>{clientById.get(job.client_id??"")?.name??"Client not linked"}{job.venue?` · ${job.venue}`:""}</p><small>{formatJobSchedule(job)}{readiness.blockers.length?` · Needs ${readiness.blockers.slice(0,2).join(", ")}`:" · Operationally ready"}</small></div><div className="readiness-stack"><strong>{readiness.score}%</strong><span className="mini-progress"><i style={{width:`${readiness.score}%`}}/></span><ArrowRight size={17}/></div></Link>;})}</section></main>;
}
