"use client";
import { useEffect, useState } from "react";
import { OnTheDay } from "./on-the-day";
import { eveningReplay, replayTime } from "@/lib/on-the-day-replay";
import type { DaySchedule } from "@/lib/on-the-day";
import styles from "./on-the-day.module.css";

/** Review-only clock: the production display and engine never accelerate time. */
export function OnTheDayReplay({ schedule }: { schedule: DaySchedule }) {
  const [now, setNow] = useState(eveningReplay.from);
  useEffect(() => {
    const opened = performance.now();
    const tick = () => setNow(replayTime(performance.now() - opened));
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, []);
  return <><p className={styles.replayLabel}>{now === eveningReplay.to ? "Evening review finished" : "Evening review · 60× speed"} · 19:50–22:30 AWST</p><OnTheDay title="Muster · On The Day" venue="Frankland River" schedule={schedule} reviewNow={now}/></>;
}
