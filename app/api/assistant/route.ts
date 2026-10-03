import { NextResponse } from "next/server";
import { parseAssistantCommand } from "@/lib/assistant/parser";
import { createRequestClient } from "@/lib/supabase/server";
import { operationMutation, packQuantityMutation } from "@/lib/assistant/mutations";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ ok: false, message: "Sign in again to continue." }, { status: 401 });
  const supabase = createRequestClient(token);
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData.user) return NextResponse.json({ ok: false, message: "Your session has expired." }, { status: 401 });
  const body = await request.json().catch(() => null) as { text?: unknown } | null;
  if (!body || typeof body.text !== "string" || body.text.trim().length > 500) {
    return NextResponse.json({ ok: false, message: "Enter a command up to 500 characters." }, { status: 400 });
  }
  const intent = parseAssistantCommand(body.text);
  try {
    const result = await executeIntent(supabase, intent);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "The action could not be completed." }, { status: 500 });
  }
}

type Client = ReturnType<typeof createRequestClient>;
type Intent = ReturnType<typeof parseAssistantCommand>;

async function executeIntent(supabase: Client, intent: Intent) {
  if (intent.type === "unknown") return { ok: false, message: intent.reason };
  if (intent.type === "find_memories") {
    const { data: jobs, error } = await supabase.from("jobs").select("id,title").ilike("title", `%${intent.jobHint}%`).limit(4);
    if (error) throw error;
    if (!jobs?.length) return { ok: false, message: `I did not change anything. No job matched “${intent.jobHint}”.` };
    if (jobs.length > 1) return { ok: false, message: `I did not change anything. ${jobs.length} jobs matched; use the full job name.`, choices: jobs };
    const { data: memories, error: memoryError } = await supabase.from("job_memories").select("id,summary,detail,job_id,category,source,created_at").eq("job_id", jobs[0].id).order("created_at", { ascending: false });
    if (memoryError) throw memoryError;
    return { ok: true, message: memories?.length ? `Found ${memories.length} saved lesson${memories.length === 1 ? "" : "s"} for ${jobs[0].title}.` : `No saved lessons yet for ${jobs[0].title}.`, results: { jobs, memories: memories ?? [] } };
  }
  if (intent.type === "find") {
    const [jobs, memories] = await Promise.all([
      supabase.from("jobs").select("id,title,status,start_at").ilike("title", `%${intent.query}%`).limit(8),
      supabase.from("job_memories").select("id,summary,job_id,category").ilike("summary", `%${intent.query}%`).limit(8)
    ]);
    return { ok: true, message: `Found ${(jobs.data?.length ?? 0) + (memories.data?.length ?? 0)} result(s).`, results: { jobs: jobs.data ?? [], memories: memories.data ?? [] } };
  }
  if (intent.type === "upsert_operation") {
    const { data: matches } = await supabase.from("operations").select("*").ilike("title", `%${intent.title}%`).neq("status", "done").limit(1);
    const payload = operationMutation(intent);
    const result = matches?.[0]
      ? await supabase.from("operations").update(payload).eq("id", matches[0].id).select().single()
      : await supabase.from("operations").insert({ ...payload, title: intent.title }).select().single();
    if (result.error) throw result.error;
    await supabase.from("activity_log").insert({ operation_id: result.data.id, action: matches?.[0] ? "operation.updated" : "operation.created", summary: `${result.data.title} assigned to ${intent.owner}`, source: payload.source, metadata: { assistant_command: intent.raw } });
    return { ok: true, message: `${matches?.[0] ? "Updated" : "Created"} “${result.data.title}”: owner ${intent.owner}${intent.dueDate ? `, due ${intent.dueDate} (date only)` : ", no due date"}.` };
  }
  if (intent.type === "capture_activity") {
    const [contacts, jobs] = await Promise.all([
      intent.contactHint ? supabase.from("contacts").select("*").ilike("display_name", `%${intent.contactHint}%`).limit(5) : Promise.resolve({ data: [], error: null }),
      intent.jobHint ? supabase.from("jobs").select("*").ilike("title", `%${intent.jobHint}%`).limit(5) : supabase.from("jobs").select("*").limit(20)
    ]);
    if (contacts.error) throw contacts.error;
    if (jobs.error) throw jobs.error;
    const contact = contacts.data?.[0] ?? null;
    const job = jobs.data?.find((item) => intent.jobHint ? true : intent.raw.toLowerCase().includes(item.title.toLowerCase())) ?? jobs.data?.[0] ?? null;
    const clientId = contact?.client_id ?? job?.client_id;
    if (!clientId) return { ok: false, message: "I heard the capture, but could not match a client or job yet. Add a client/contact name or job title." };
    const activity = await supabase.from("crm_activities").insert({
      activity_type: intent.activityType,
      client_id: clientId,
      contact_id: contact?.id ?? job?.primary_contact_id ?? null,
      job_id: job?.id ?? null,
      direction: intent.activityType === "Phone Call" ? "inbound" : "internal",
      subject: intent.summary,
      summary: intent.raw,
      source: "capture",
      occurred_at: new Date().toISOString()
    }).select().single();
    if (activity.error) throw activity.error;
    if (job) {
      await supabase.from("job_changes").insert({ job_id: job.id, summary: "Captured client update", detail: intent.summary, source: "cameron", requires_attention: true, source_ref: activity.data.id });
      if (/(confirm|check|follow up|availability|invoice|quote|request)/i.test(intent.summary)) {
        await supabase.from("tasks").insert({ title: taskTitle(intent.summary), client_id: clientId, contact_id: contact?.id ?? job.primary_contact_id ?? null, job_id: job.id, source_activity_id: activity.data.id, status: "To Do", priority: /urgent|today|asap/i.test(intent.summary) ? "Urgent" : "Normal" });
      }
    }
    return { ok: true, message: `Captured ${intent.activityType.toLowerCase()}${job ? ` against ${job.title}` : ""}. I created a review item before changing production details.`, results: { jobs: job ? [{ id: job.id, title: job.title }] : [] } };
  }
  const { data: jobs, error: jobError } = await supabase.from("jobs").select("*").ilike("title", `%${intent.type === "remember" ? intent.jobHint ?? "" : intent.jobHint}%`).limit(3);
  if (jobError) throw jobError;
  if (!jobs?.length) return { ok: false, message: "I could not match that to a job. Include the job name and try again." };
  if (jobs.length > 1) return { ok: false, message: `I found ${jobs.length} possible jobs. Use the full job name so I do not change the wrong one.`, choices: jobs.map(({ id, title }) => ({ id, title })) };
  const job = jobs[0];
  if (intent.type === "remember") {
    const { error } = await supabase.from("job_memories").insert({ job_id: job.id, client_id: job.client_id, category: "change_next_time", summary: intent.summary, source: "cameron" });
    if (error) throw error;
    await supabase.from("activity_log").insert({ job_id: job.id, action: "memory.created", summary: `Remembered for ${job.title}: ${intent.summary}`, source: "cameron", metadata: {} });
    return { ok: true, message: `Remembered for ${job.title}.` };
  }
  if (intent.type === "inform_arrival") {
    const date = job.start_at ? new Date(job.start_at) : new Date();
    const match = intent.timeText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)!;
    let hour = Number(match[1]); const minute = Number(match[2] ?? 0);
    if (match[3]?.toLowerCase() === "pm" && hour < 12) hour += 12;
    if (match[3]?.toLowerCase() === "am" && hour === 12) hour = 0;
    date.setHours(hour, minute, 0, 0);
    const { error } = await supabase.from("jobs").update({ arrival_at: date.toISOString() }).eq("id", job.id);
    if (error) throw error;
    await supabase.from("job_changes").insert({ job_id: job.id, summary: "Site arrival updated", detail: intent.raw, source: "cameron", requires_attention: false });
    return { ok: true, message: `Site arrival for ${job.title} is now ${date.toLocaleString("en-AU", { weekday: "short", hour: "numeric", minute: "2-digit" })}.` };
  }
  const { data: items } = await supabase.from("pack_items").select("*").eq("job_id", job.id).ilike("item_name", `%${intent.itemHint}%`).limit(3);
  if ((items?.length ?? 0) > 1) return { ok: false, message: "I found multiple matching pack items. Use the exact item name." };
  const current = items?.[0]; const quantity = packQuantityMutation(current?.quantity_planned ?? 0, intent.quantity); const nextQuantity = quantity.after;
  const result = current
    ? await supabase.from("pack_items").update({ quantity_planned: nextQuantity }).eq("id", current.id).select().single()
    : await supabase.from("pack_items").insert({ job_id: job.id, item_name: intent.itemHint, quantity_planned: intent.quantity, notes: "Added from Timbre Ops assistant" }).select().single();
  if (result.error) throw result.error;
  const summary = `Added ${intent.quantity} ${intent.itemHint} to ${job.title} pack list`;
  await Promise.all([
    supabase.from("job_changes").insert({ job_id: job.id, summary, detail: `${result.data.item_name} planned quantity is now ${result.data.quantity_planned}.`, source: "cameron", requires_attention: false }),
    supabase.from("activity_log").insert({ job_id: job.id, action: "pack_item.updated", summary, source: "cameron", metadata: { item_id: result.data.id, quantity_added: intent.quantity } })
  ]);
  return { ok: true, message: `Changed ${job.title} pack list: ${result.data.item_name} planned quantity ${result.data.quantity_planned - intent.quantity} → ${result.data.quantity_planned}.` };
}

function taskTitle(summary: string) {
  const cleaned = summary.replace(/^.*?\b(?:need|needs|want|wants|asked for|requested)\b/i, "").trim();
  return cleaned ? `Confirm ${cleaned}` : "Follow up captured client request";
}
