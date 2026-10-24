import { perthTimeZone } from "@/lib/format";
import type { CrmTask } from "@/types/database";

/** Date-only follow-ups use the business day in Perth, regardless of device timezone. */
export function groupTasks(tasks: CrmTask[], now: Date) {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone: perthTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const monday = new Date(`${today}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() + 8 - (monday.getUTCDay() || 7));
  const nextWeek = monday.toISOString().slice(0, 10);
  const pending = tasks.filter(task => task.status === "To Do");
  return [
    { title: "Today", items: pending.filter(task => task.due_date && task.due_date <= today) },
    { title: "This Week", items: pending.filter(task => task.due_date && task.due_date > today && task.due_date < nextWeek) },
    { title: "Waiting", items: tasks.filter(task => task.status === "Waiting") },
    { title: "Later & undated", items: pending.filter(task => !task.due_date || task.due_date >= nextWeek) },
    { title: "Completed", items: tasks.filter(task => task.status === "Done") }
  ];
}
