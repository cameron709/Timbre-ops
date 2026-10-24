"use client";
import React, { useEffect, useState } from "react";
import type { DaySchedule } from "@/lib/on-the-day";
import { deriveOnTheDay } from "@/lib/on-the-day";
import styles from "./on-the-day.module.css";
const formatTime = (at: number, timeZone?: string) => new Intl.DateTimeFormat("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(at);

export function OnTheDay({ title, venue, schedule, reviewNow }: { title: string; venue?: string | null; schedule: DaySchedule; reviewNow?: number }) {
  const [liveNow, setNow] = useState<number | null>(null);
  const now = reviewNow ?? liveNow;
  // Fixed review fixtures must render identically on Netlify (UTC) and clients.
  // Live jobs render after mount and continue using the device timezone.
  const timeZone = reviewNow !== undefined ? "Australia/Perth" : undefined;
  const time = (at: number) => formatTime(at, timeZone);
  useEffect(() => {
    if (reviewNow !== undefined) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", tick); window.removeEventListener("focus", tick); };
  }, [reviewNow]);
  if (now === null) return <p>Opening On The Day…</p>;
  const context = deriveOnTheDay(schedule, now);
  const deadline = context.hardDeadline;
  const attention = deadline?.marginMinutes !== undefined && deadline.marginMinutes <= 10;
  const deadlineText = deadline?.marginMinutes === undefined ? undefined : deadline.marginMinutes < 0
    ? `${Math.abs(deadline.marginMinutes)} min beyond deadline` : `${deadline.marginMinutes} min margin`;
  const constraint = attention ? <p className={styles.attention}>Hard curfew {time(deadline!.at)} · {deadlineText}</p> : null;
  return <div className={styles.display}>
    <section className={styles.primary} aria-label="Current event state">
      <time className={styles.clock} dateTime={new Date(now).toISOString()}>{time(now)}</time>
      <p className={styles.local}>{new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "short", timeZoneName: "short", timeZone }).format(now)} · {reviewNow !== undefined ? "Review time" : "Device local time"}</p>
      <header className={styles.identity}><h1>{title}</h1>{venue ? <p>{venue}</p> : null}</header>
      {context.currentItem ? <div className={styles.current}>
        <p className={styles.label}>Now · {context.currentPhase} · Expected</p>
        <h2>{context.currentItem.title}</h2>
        {constraint}
        {context.remainingMinutes !== undefined ? <p className={styles.remaining}>{context.remainingMinutes} min remaining</p>
          : context.overrun ? <p className={styles.remaining}>Expected transition</p>
          : <p className={styles.remaining}>{context.elapsedMinutes} min elapsed</p>}
        {context.scheduleDriftMinutes > 0 ? <p className={styles.warning}>Projected {context.scheduleDriftMinutes} min behind</p> : null}
        {context.currentProjectedEnd !== undefined ? <p>{context.scheduleDriftMinutes > 0 ? "Projected" : "Scheduled"} finish {time(context.currentProjectedEnd)}</p>
          : <p>From {time(context.currentProjectedStart!)} · Finish unknown</p>}
      </div> : context.expectedFinished ? <div className={styles.current}>
        <p className={styles.label}>Now · After programme · Expected</p><h2>Programme expected to have finished</h2>
        {constraint}
        {context.projectedFinish !== undefined ? <p>Expected finish {time(context.projectedFinish)}</p> : null}
        {context.scheduleDriftMinutes > 0 ? <p className={styles.warning}>Projected {context.scheduleDriftMinutes} min behind</p> : null}
      </div> : context.countdownMinutes !== undefined ? <div className={styles.current}>
        <p className={styles.label}>Up next</p><h2>{context.nextMilestones[0].title}</h2>{constraint}
        <p className={styles.remaining}>In {context.countdownMinutes} min</p>
      </div> : !context.hasSchedule ? <p>Live schedule intelligence is unavailable because no timed run sheet is recorded.</p> : null}
    </section>
    {context.nextMilestones.length || (context.projectedFinish !== undefined && !context.expectedFinished) || (context.hardDeadline && !attention) || context.warnings.length ? <aside className={styles.secondary}>
      {context.nextMilestones.length ? <section><h2 className={styles.label}>{context.scheduleDriftMinutes > 0 ? "Projected next" : "Next"}</h2><ol className={styles.milestones}>{context.nextMilestones.map(item => <li key={item.id}><time dateTime={new Date(item.projectedStart).toISOString()}>{time(item.projectedStart)}</time><span>{item.title}</span></li>)}</ol></section> : null}
      {context.projectedFinish !== undefined && !context.expectedFinished ? <p className={styles.projection}>Projected programme finish <strong>{time(context.projectedFinish)}</strong></p> : null}
      {context.hardDeadline && !attention ? <section className={styles.deadline}><h2 className={styles.label}>{context.hardDeadline.label}</h2><strong>{time(context.hardDeadline.at)}</strong>{context.hardDeadline.marginMinutes !== undefined ? <p className={context.hardDeadline.marginMinutes < 0 ? styles.warning : undefined}>{context.hardDeadline.marginMinutes >= 0 ? `${context.hardDeadline.marginMinutes} min margin` : `${Math.abs(context.hardDeadline.marginMinutes)} min beyond deadline`}</p> : null}</section> : null}
      {context.warnings.map(warning => <p className={styles.warning} key={warning}>{warning}</p>)}
    </aside> : null}
  </div>;
}
