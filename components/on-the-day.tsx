"use client";
import React, { useEffect, useState } from "react";
import type { DaySchedule } from "@/lib/on-the-day";
import { deriveOnTheDay } from "@/lib/on-the-day";
import styles from "./on-the-day.module.css";
const time = (at: number) => new Intl.DateTimeFormat("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false }).format(at);

export function OnTheDay({ title, venue, schedule, reviewNow }: { title: string; venue?: string | null; schedule: DaySchedule; reviewNow?: number }) {
  const [liveNow, setNow] = useState<number | null>(null);
  const now = reviewNow ?? liveNow;
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
  return <div className={styles.display}>
    <section className={styles.primary} aria-label="Current event state">
      <time className={styles.clock} dateTime={new Date(now).toISOString()}>{time(now)}</time>
      <p className={styles.local}>{new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "short", timeZoneName: "short" }).format(now)} · Device local time</p>
      <header className={styles.identity}><h1>{title}</h1>{venue ? <p>{venue}</p> : null}</header>
      {context.currentItem ? <div className={styles.current}><p className={styles.label}>Now · {context.currentPhase} · Scheduled</p><h2>{context.currentItem.title}</h2>
        {context.overrun ? <p className={styles.warning}>Likely running {context.scheduleDriftMinutes} min over</p> : context.remainingMinutes !== undefined ? <p className={styles.remaining}>{context.remainingMinutes} min remaining</p> : <p className={styles.remaining}>{context.elapsedMinutes} min elapsed</p>}
        {context.currentItem.end !== undefined ? <p>Scheduled finish {time(context.currentItem.end)}</p> : <p>From {time(context.currentItem.start)} · Finish unknown</p>}
      </div> : context.countdownMinutes !== undefined ? <div className={styles.current}><p className={styles.label}>Up next</p><h2>{context.nextMilestones[0].title}</h2><p className={styles.remaining}>In {context.countdownMinutes} min</p></div> : !context.hasSchedule ? <p>Live schedule intelligence is unavailable because no timed run sheet is recorded.</p> : null}
    </section>
    <aside className={styles.secondary}>
      {context.nextMilestones.length ? <section><h2 className={styles.label}>{context.overrun ? "Projected next" : "Next"}</h2><ol className={styles.milestones}>{context.nextMilestones.map(item => <li key={item.id}><time dateTime={new Date(item.projectedStart).toISOString()}>{time(item.projectedStart)}</time><span>{item.title}</span></li>)}</ol></section> : null}
      {context.projectedFinish !== undefined ? <p className={styles.projection}>Projected programme finish <strong>{time(context.projectedFinish)}</strong></p> : null}
      {context.hardDeadline ? <section className={styles.deadline}><h2 className={styles.label}>{context.hardDeadline.label}</h2><strong>{time(context.hardDeadline.at)}</strong>{context.hardDeadline.marginMinutes !== undefined ? <p className={context.hardDeadline.marginMinutes < 0 ? styles.warning : undefined}>{context.hardDeadline.marginMinutes >= 0 ? `${context.hardDeadline.marginMinutes} min margin` : `${Math.abs(context.hardDeadline.marginMinutes)} min beyond deadline`}</p> : null}</section> : null}
      {context.warnings.map(warning => <p className={styles.warning} key={warning}>{warning}</p>)}
      {context.hasSchedule ? <p className={styles.note}>Schedule-based estimate. Actual progress is unconfirmed; the next scheduled start advances the display automatically.</p> : null}
    </aside>
  </div>;
}
