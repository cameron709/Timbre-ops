export type AssistantIntent =
  | {
      type: "add_pack_item_quantity";
      raw: string;
      jobHint: string;
      itemHint: string;
      quantity: number;
    }
  | {
      type: "upsert_operation";
      raw: string;
      owner: "Cameron" | "Beth";
      title: string;
      dueAt: string | null;
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
    return {
      type: "upsert_operation",
      raw,
      owner,
      title: titleCaseTask(operationMatch.groups.task),
      dueAt: operationMatch.groups.due ? parseDueDate(operationMatch.groups.due, now) : null
    };
  }

  return {
    type: "unknown",
    raw,
    reason: "I can add gear to a job pack list or create an operation for Cameron/Beth in this milestone."
  };
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
