export type MatchJob = { title: string; venue?: string | null; startDate?: string | null; clientName?: string | null; contactEmails?: string[] };
export type MatchThread = { subject: string; snippet?: string | null; participants: string[]; messageDates: string[] };
export type MatchResult = { score: number; reasons: string[]; eligible: boolean };

const words = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((word) => word.length > 2);
const overlap = (a: string, b: string) => {
  const right = new Set(words(b));
  return [...new Set(words(a))].filter((word) => right.has(word));
};
const DAY = 86400000;
const PLANNING_WINDOW_DAYS = 300;
const GENERIC_SINGLE_TITLE_WORDS = new Set(["event","show","festival","awards","award","music","party","concert","gala","function"]);

export function scoreThreadMatch(job: MatchJob, thread: MatchThread): MatchResult {
  const haystack = `${thread.subject} ${thread.snippet ?? ""}`;
  const reasons: string[] = [];
  let score = 0;

  const titleWords = overlap(job.title, haystack);
  if (titleWords.length >= 2) {
    score += Math.min(45, 20 + titleWords.length * 5);
    reasons.push(`event name: ${titleWords.join(", ")}`);
  } else if (titleWords.length === 1 && !GENERIC_SINGLE_TITLE_WORDS.has(titleWords[0])) {
    score += 15;
    reasons.push(`event keyword: ${titleWords[0]}`);
  }

  if (job.clientName && overlap(job.clientName, haystack).length) {
    score += 20;
    reasons.push(`client: ${job.clientName}`);
  }
  if (job.venue && overlap(job.venue, haystack).length) {
    score += 15;
    reasons.push(`venue: ${job.venue}`);
  }

  const participantText = thread.participants.join(" ").toLowerCase();
  const matchedEmail = job.contactEmails?.find((email) => participantText.includes(email.toLowerCase()));
  if (matchedEmail) {
    score += 25;
    reasons.push(`contact: ${matchedEmail}`);
  }

  const participantIdentity = thread.participants.join(" ").replace(/\d+/g, " ");
  const participantTitleWords = overlap(job.title, participantIdentity)
    .filter((word) => !GENERIC_SINGLE_TITLE_WORDS.has(word));
  if (!matchedEmail && participantTitleWords.length) {
    score += Math.min(25, 15 + participantTitleWords.length * 5);
    reasons.push(`participant identity: ${participantTitleWords.join(", ")}`);
  }

  let outsidePlanningWindow = false;
  if (job.startDate && thread.messageDates.length) {
    const eventTime = new Date(job.startDate).getTime();
    const deltas = thread.messageDates
      .map((date) => Math.abs(new Date(date).getTime() - eventTime))
      .filter(Number.isFinite);
    if (deltas.length) {
      const closestDays = Math.min(...deltas) / DAY;
      if (closestDays <= 120) {
        score += 10;
        reasons.push("message date near event");
      }
      if (closestDays > PLANNING_WINDOW_DAYS) {
        outsidePlanningWindow = true;
        reasons.push("historical thread outside planning window");
      }
    }
  }

  const distinctSignals = reasons.filter((reason) => !reason.startsWith("message date") && !reason.startsWith("historical thread")).length;
  return { score: Math.min(100, score), reasons, eligible: !outsidePlanningWindow && score >= 45 && distinctSignals >= 2 };
}
