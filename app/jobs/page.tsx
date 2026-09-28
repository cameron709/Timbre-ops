"use client";
import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
import { ArrowRight,ClipboardList,Search } from "lucide-react";
import { EmptyState,Pill } from "@/components/ui";
import { formatDateTime,statusLabel } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Client,Job } from "@/types/database";

const filters=["active","upcoming","enquiries","quoting","confirmed","planning","complete"] as const;
type Filter=(typeof filters)[number];
export default function JobsPage(){
 const supabase=useMemo(()=>createBrowserClient(),[]),[jobs,setJobs]=useState<Job[]>([]),[clients,setClients]=useState<Client[]>([]),[filter,setFilter]=useState<Filter>("active"),[search,setSearch]=useState("");
 useEffect(()=>{Promise.all([supabase.from("jobs").select("*").order("start_at",{ascending:true,nullsFirst:false}),supabase.from("clients").select("*")]).then(([a,b])=>{setJobs(a.data??[]);setClients(b.data??[]);});},[supabase]);
 const visible=jobs.filter((job)=>{const q=search.toLowerCase(),matches=!q||[job.title,job.venue,clients.find(c=>c.id===job.client_id)?.name].some(v=>v?.toLowerCase().includes(q));if(!matches)return false;if(filter==="active")return !["complete","debriefed","invoiced","closed","cancelled"].includes(job.status);if(filter==="upcoming")return Boolean(job.start_at&&new Date(job.start_at)>=new Date());if(filter==="enquiries")return ["enquiry","assessing","site_discovery"].includes(job.status);if(filter==="quoting")return ["quoting","quote_sent"].includes(job.status);if(filter==="confirmed")return job.status==="confirmed";if(filter==="planning")return ["planning","ready_to_pack","packed","on_site"].includes(job.status);return ["complete","debriefed","invoiced","closed"].includes(job.status);});
 const clientById=new Map(clients.map(c=>[c.id,c]));
 return <main className="page"><header className="page-head"><div><p className="eyebrow">Operational source of truth</p><h1>Jobs</h1><p>{visible.length} records in this view</p></div></header>
 <div className="search-field"><Search size={18}/><input aria-label="Search jobs" placeholder="Search jobs, clients or venues" value={search} onChange={e=>setSearch(e.target.value)}/></div>
 <div className="filter-row scroll" role="tablist" aria-label="Job filters">{filters.map(item=><button className={filter===item?"active":""} onClick={()=>setFilter(item)} type="button" key={item}>{statusLabel(item)}</button>)}</div>
 <section className="job-list">{!visible.length?<EmptyState icon={ClipboardList} title="No matching jobs" body="Try another search or filter."/>:null}{visible.map(job=>{const missing=[!job.venue&&"venue",!job.client_id&&"client",!job.brief&&!job.intent&&"brief"].filter(Boolean);return <Link href={`/jobs/${job.id}`} className="job-row" key={job.id}><div className="job-date"><strong>{job.start_at?new Intl.DateTimeFormat("en-AU",{day:"2-digit",month:"short",timeZone:"Australia/Perth"}).format(new Date(job.start_at)):"TBC"}</strong></div><div className="job-main"><div><h2>{job.title}</h2><Pill tone={["confirmed","planning","ready_to_pack"].includes(job.status)?"good":"neutral"}>{statusLabel(job.status)}</Pill></div><p>{clientById.get(job.client_id??"")?.name??"Client not linked"}{job.venue?` · ${job.venue}`:""}</p><small>{formatDateTime(job.start_at)}{missing.length?` · Needs ${missing.join(", ")}`:" · Core details ready"}</small></div><div className="readiness-stack"><strong>{job.readiness}%</strong><span className="mini-progress"><i style={{width:`${job.readiness}%`}}/></span><ArrowRight size={17}/></div></Link>;})}</section></main>;
}
