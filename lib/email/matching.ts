export type MatchJob = { title: string; venue?: string | null; startDate?: string | null; clientName?: string | null; contactEmails?: string[] };
export type MatchThread = { subject: string; snippet?: string | null; participants: string[]; messageDates: string[] };
export type MatchResult = { score: number; reasons: string[]; eligible: boolean };

const words = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((word) => word.length > 2);
const overlap = (a: string, b: string) => {
  const right = new Set(words(b));
  return [...new Set(words(a))].filter((word) => right.has(word));
};

export function scoreThreadMatch(job: MatchJob, thread: MatchThread): MatchResult {
  const haystack = `${thread.subject} ${thread.snippet ?? ""}`;
  const reasons: string[] = [];
  let score = 0;
  const titleWords = overlap(job.title, haystack);
  if (titleWords.length >= 2) { score += Math.min(45, 20 + titleWords.length * 5); reasons.push(`event name: ${titleWords.join(", ")}`); }
  if (job.clientName && overlap(job.clientName, haystack).length) { score += 20; reasons.push(`client: ${job.clientName}`); }
  if (job.venue && overlap(job.venue, haystack).length) { score += 15; reasons.push(`venue: ${job.venue}`); }
  const participantText = thread.participants.join(" ").toLowerCase();
  const matchedEmail = job.contactEmails?.find((email) => participantText.includes(email.toLowerCase()));
  if (matchedEmail) { score += 25; reasons.push(`contact: ${matchedEmail}`); }
  if (job.startDate && thread.messageDates.some((date) => Math.abs(new Date(date).getTime() - new Date(job.startDate!).getTime()) < 120 * 86400000)) {
    score += 10; reasons.push("message date near event");
  }
  const distinctSignals = reasons.filter((reason) => !reason.startsWith("message date")).length;
  return { score: Math.min(100, score), reasons, eligible: score >= 45 && distinctSignals >= 2 };
}
