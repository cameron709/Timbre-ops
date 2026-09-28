"use client";
import { useEffect, useMemo, useState } from "react";
import { Bot, CalendarDays, Mail, ShieldCheck } from "lucide-react";
import { Pill, Section } from "@/components/ui";
import { createBrowserClient } from "@/lib/supabase/client";
import type { IntegrationConnection, TeamMember } from "@/types/database";
const integrations=[
  {provider:"gmail",label:"Gmail",icon:Mail,detail:"Email remains authoritative. Connection and sync credentials are not configured yet."},
  {provider:"google_calendar",label:"Google Calendar",icon:CalendarDays,detail:"The Calendar page currently uses job dates stored in Timbre Ops."},
  {provider:"openai",label:"AI interpretation",icon:Bot,detail:"Deterministic commands are active. No OpenAI key is configured."}
] as const;
export default function SettingsPage(){const supabase=useMemo(()=>createBrowserClient(),[]);const[connections,setConnections]=useState<IntegrationConnection[]>([]);const[member,setMember]=useState<TeamMember|null>(null);useEffect(()=>{Promise.all([supabase.from("integration_connections").select("*"),supabase.from("team_members").select("*").maybeSingle()]).then(([a,b])=>{setConnections(a.data??[]);setMember(b.data??null);});},[supabase]);return <main className="page"><header className="page-head"><div><p className="eyebrow">Workspace</p><h1>Settings</h1><p>Access and connection status, without implying unavailable services are live.</p></div></header><Section title="Team access"><div className="settings-row"><ShieldCheck size={20}/><span><strong>{member?.display_name??"Signed-in member"}</strong><small>{member?.role??"Checking access"} · protected by Supabase Auth and RLS</small></span><Pill tone="good">Active</Pill></div></Section><Section title="Connections"><div className="settings-list">{integrations.map((item)=>{const Icon=item.icon,connection=connections.find((c)=>c.provider===item.provider);return <div className="settings-row" key={item.provider}><Icon size={20}/><span><strong>{item.label}</strong><small>{connection?.last_error??item.detail}</small></span><Pill tone={connection?.status==="connected"?"good":"quiet"}>{connection?.status??"Not configured"}</Pill></div>;})}</div></Section></main>}
