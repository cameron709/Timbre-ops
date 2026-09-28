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
