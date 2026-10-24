import { notFound } from "next/navigation";
import Link from "next/link";
import { OnTheDay } from "@/components/on-the-day";
import styles from "@/components/on-the-day.module.css";
import type { DaySchedule } from "@/lib/on-the-day";
const at = (time: string) => Date.parse(`2026-10-24T${time}:00+08:00`);
export default async function Review({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  if (process.env.NEXT_PUBLIC_ENABLE_REVIEW_FIXTURES !== "1") notFound();
  const { scenario = "active" } = await searchParams;
  const schedule: DaySchedule = { warnings: [], items: [
    { id: "act", title: "Rogue Pony", phase: "Show", start: at("20:00"), end: at("20:30") },
    { id: "change", title: "Changeover", phase: "Changeover", start: at("20:40"), end: at("20:50") },
    { id: "mc", title: "MC", phase: "Show", start: at("21:00"), end: at("21:53") }
  ] };
  if (scenario.startsWith("curfew")) schedule.deadline = { label: "Hard curfew", at: at("22:00") };
  if (scenario === "sparse") schedule.items = [];
  const now = scenario === "pre" ? at("19:50") : ["overrun", "curfew-delay"].includes(scenario) ? at("20:37") : at("20:14");
  return <main className="page"><nav aria-label="Review scenarios" className={styles.reviewNav}>{["pre", "active", "overrun", "curfew", "curfew-delay", "sparse"].map(value => <Link key={value} href={`?scenario=${value}`}>{value}</Link>)}</nav><OnTheDay title="Muster · On The Day" venue={scenario === "sparse" ? undefined : "Frankland River"} schedule={schedule} reviewNow={now}/></main>;
}
