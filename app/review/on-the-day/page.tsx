import { notFound } from "next/navigation";
import Link from "next/link";
import { OnTheDay } from "@/components/on-the-day";
import styles from "@/components/on-the-day.module.css";
import { dayReviewScenarios, onTheDayReview, type DayReviewScenario } from "@/lib/on-the-day-review";

export default async function Review({ searchParams }: { searchParams: Promise<{ scenario?: string }> }) {
  if (process.env.NEXT_PUBLIC_ENABLE_REVIEW_FIXTURES !== "1") notFound();
  const { scenario = "active" } = await searchParams;
  if (!dayReviewScenarios.includes(scenario as DayReviewScenario)) notFound();
  const { schedule, now } = onTheDayReview(scenario as DayReviewScenario);
  return <main className="page"><nav aria-label="Review scenarios" className={styles.reviewNav}>{dayReviewScenarios.map(value => <Link key={value} aria-current={scenario === value ? "page" : undefined} href={`?scenario=${value}`}>{value}</Link>)}</nav><OnTheDay title="Muster · On The Day" venue={scenario === "sparse" ? undefined : "Frankland River"} schedule={schedule} reviewNow={now}/></main>;
}
