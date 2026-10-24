"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { OnTheDay } from "@/components/on-the-day";
import { scheduleFromJob } from "@/lib/on-the-day";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Job } from "@/types/database";

export default function OnTheDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [state, setState] = useState<{ job?: Job; message?: string }>({});
  useEffect(() => {
    let active = true;
    const client = createBrowserClient();
    const load = async () => {
      const { data, error } = await client.from("jobs").select("*").eq("id", id).single();
      if (active) setState(previous => error ? { ...previous, message: "Could not refresh job details. Displayed schedule may be out of date." } : { job: data });
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => { active = false; clearInterval(timer); };
  }, [id]);
  return <main className="page"><Link className="back-link" href={`/jobs/${id}`}>← Job workspace</Link>{state.message ? <p role="status" className="notice">{state.message}</p> : null}{state.job?.id === id ? <OnTheDay title={state.job.title} venue={state.job.venue} schedule={scheduleFromJob(state.job)}/> : <p>{state.message ? "Job unavailable. Check access or return to the workspace." : "Loading job…"}</p>}</main>;
}
