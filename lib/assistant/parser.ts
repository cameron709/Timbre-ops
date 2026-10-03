export type AssistantIntent =
  | {
      type: "add_pack_item_quantity";
      raw: string;
      jobHint: string;
      itemHint: string;
      quantity: number;
    }
  | { type: "remember"; raw: string; jobHint: string | null; summary: string }
  | { type: "capture_activity"; raw: string; contactHint: string | null; jobHint: string | null; activityType: "Phone Call" | "Note"; summary: string }
  | { type: "inform_arrival"; raw: string; jobHint: string; timeText: string }
  | { type: "find"; raw: string; query: string }
  | { type: "find_memories"; raw: string; jobHint: string }
  | {
      type: "upsert_operation";
      raw: string;
      owner: "Cameron" | "Beth";
      title: string;
      dueAt: string | null;
      dueDate: string | null;
      duePrecision: "none" | "date";
    }
  | {
      type: "unknown";
      raw: string;
      reason: string;
    };

const numberWords: Record<string, number> = {
  a: 1,
  an: 1,
  another: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10
};

const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function parseAssistantCommand(input: string, now = new Date()): AssistantIntent {
  const raw = input.trim();
  const normalized = raw.replace(/\s+/g, " ");

  const lessonsMatch = normalized.match(/^(?:what did we learn from|what should we remember (?:about|from)|show (?:me )?(?:the )?lessons from)\s+(?<job>.+?)\??$/i);
  if (lessonsMatch?.groups) return { type: "find_memories", raw, jobHint: lessonsMatch.groups.job.trim() };

  const rememberMatch = normalized.match(/^(?:remember|next time[:,]?)\s+(?<summary>.+?)(?:\s+for\s+(?<job>.+))?$/i);
  if (rememberMatch?.groups) return { type: "remember", raw, summary: rememberMatch.groups.summary.trim(), jobHint: rememberMatch.groups.job?.trim() ?? null };

  const informMatch = normalized.match(/^(?:.+?\s+said\s+)?(?:we\s+can\s+)?(?:get\s+)?(?:onto|on)\s+site\s+at\s+(?<time>\d{1,2}(?::\d{2})?\s*(?:am|pm)?)(?:\s+for\s+(?<job>.+))$/i);
  if (informMatch?.groups) return { type: "inform_arrival", raw, timeText: informMatch.groups.time, jobHint: informMatch.groups.job.trim() };

  const activityMatch = normalized.match(/^(?:(?<contact>[A-Z][\w' -]{1,40})\s+)?(?<verb>called|rang|phoned|said|emailed|noted)\.?\s*(?<summary>.+)$/i);
  if (activityMatch?.groups) {
    const contactHint = activityMatch.groups.contact?.trim() ?? null;
    const summary = activityMatch.groups.summary.trim();
    const jobMatch = summary.match(/\b(?:for|about|re)\s+(?<job>[A-Z0-9][\w'& -]{2,60})(?:\.|,| and |$)/i);
    return {
      type: "capture_activity",
      raw,
      contactHint,
      jobHint: jobMatch?.groups?.job?.trim() ?? null,
      activityType: /called|rang|phoned/i.test(activityMatch.groups.verb) ? "Phone Call" : "Note",
      summary
    };
  }

  const findMatch = normalized.match(/^(?:find|show me|search for)\s+(?<query>.+)$/i);
  if (findMatch?.groups) return { type: "find", raw, query: findMatch.groups.query.trim() };

  const packMatch = normalized.match(/^add\s+(?<quantity>\d+|a|an|another|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<item>.+?)\s+to\s+(?<job>.+)$/i);
  if (packMatch?.groups) {
    const quantityToken = packMatch.groups.quantity.toLowerCase();
    return {
      type: "add_pack_item_quantity",
      raw,
      quantity: Number(quantityToken) || numberWords[quantityToken] || 1,
      itemHint: normalizeItemHint(packMatch.groups.item),
      jobHint: packMatch.groups.job.trim()
    };
  }

  const operationMatch = normalized.match(/^(?<owner>cameron|beth)\s+needs\s+to\s+(?<task>.+?)(?:\s+by\s+(?<due>.+))?$/i);
  if (operationMatch?.groups) {
    const owner = titleCaseName(operationMatch.groups.owner);
    const dueAt = operationMatch.groups.due ? parseDueDate(operationMatch.groups.due, now) : null;
    return {
      type: "upsert_operation",
      raw,
      owner,
      title: titleCaseTask(operationMatch.groups.task),
      dueAt,
      dueDate: dueAt ? dateInPerth(dueAt) : null,
      duePrecision: dueAt ? "date" : "none"
    };
  }

  return {
    type: "unknown",
    raw,
      reason: "I did not change anything. Try “Tammy called. NAIDOC access is now 7:30 and they want another handheld”, “Add another DI to Mad Hatters”, “Beth needs to order a marquee by Wednesday”, “What did we learn from Mad Hatters?”, or “Find Wine Show”."
  };
}

function dateInPerth(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Perth", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function parseDueDate(phrase: string, now = new Date()) {
  const text = phrase.trim().toLowerCase();
  const today = new Date(now);
  const lowerDay = weekdays.find((weekday) => text.includes(weekday));

  if (text === "today") return atBusinessHour(today);
  if (text === "tomorrow") {
    const date = new Date(today);
    date.setDate(date.getDate() + 1);
    return atBusinessHour(date);
  }

  if (lowerDay) {
    const target = weekdays.indexOf(lowerDay);
    const date = new Date(today);
    const delta = (target - date.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + delta);
    return atBusinessHour(date);
  }

  const parsed = new Date(phrase);
  if (!Number.isNaN(parsed.valueOf())) {
    return atBusinessHour(parsed);
  }

  return null;
}

function atBusinessHour(date: Date) {
  const next = new Date(date);
  next.setHours(9, 0, 0, 0);
  return next.toISOString();
}

function normalizeItemHint(item: string) {
  const normalized = item.trim();
  if (/^di$/i.test(normalized)) return "DI";
  return normalized;
}

function titleCaseName(value: string): "Cameron" | "Beth" {
  return value.toLowerCase() === "beth" ? "Beth" : "Cameron";
}

function titleCaseTask(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^order a /i, "order ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
