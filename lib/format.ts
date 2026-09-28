export const perthTimeZone = "Australia/Perth";

export function formatDate(value: string | null, options: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: perthTimeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...options
  }).format(new Date(value));
}

export function formatDateTime(value: string | null) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: perthTimeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export type TemporalValue = {
  precision: "none" | "date" | "timed";
  date: string | null;
  dateTime: string | null;
};

export function formatTemporal(value: TemporalValue) {
  if (value.precision === "none" || (!value.date && !value.dateTime)) return "No date";
  if (value.precision === "date") return formatDateOnly(value.date ?? localDateFromTimestamp(value.dateTime));
  return formatDateTime(value.dateTime);
}

export function formatDateOnly(value: string | null) {
  if (!value) return "Date TBC";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: perthTimeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function formatJobSchedule(job: Pick<import("@/types/database").Job, "date_precision" | "start_date" | "start_at">) {
  return formatTemporal({ precision: job.date_precision, date: job.start_date, dateTime: job.start_at });
}

export function formatOperationDue(operation: Pick<import("@/types/database").Operation, "due_precision" | "due_date" | "due_at">) {
  return operation.due_precision === "none" && operation.due_at === null
    ? "No due date"
    : formatTemporal({ precision: operation.due_precision, date: operation.due_date, dateTime: operation.due_at });
}

function localDateFromTimestamp(value: string | null) {
  if (!value) return null;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: perthTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: perthTimeZone,
      hour: "numeric",
      hour12: false
    }).format(now)
  );

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
