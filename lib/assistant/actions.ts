"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAssistantCommand } from "@/lib/assistant/parser";
import type { Database, Operation, PackItem } from "@/types/database";

export type AssistantResult = {
  ok: boolean;
  message: string;
};

type Client = SupabaseClient<Database>;

export async function runAssistantCommand(supabase: Client, input: string): Promise<AssistantResult> {
  const intent = parseAssistantCommand(input);

  if (intent.type === "unknown") {
    return { ok: false, message: intent.reason };
  }

  if (intent.type === "add_pack_item_quantity") {
    return addPackItemQuantity(supabase, intent.jobHint, intent.itemHint, intent.quantity);
  }

  if (intent.type === "upsert_operation") {
    return upsertOperation(supabase, intent.owner, intent.title, intent.dueAt, intent.raw);
  }
  return { ok: false, message: "Use the current server assistant for this command." };
}

async function addPackItemQuantity(supabase: Client, jobHint: string, itemHint: string, quantity: number): Promise<AssistantResult> {
  const { data: jobs, error: jobError } = await supabase
    .from("jobs")
    .select("id,title")
    .ilike("title", `%${jobHint}%`)
    .limit(3);

  if (jobError) return { ok: false, message: jobError.message };
  if (!jobs?.length) return { ok: false, message: `I could not find a job matching "${jobHint}".` };
  if (jobs.length > 1) return { ok: false, message: `I found more than one job matching "${jobHint}". Open the job and try from there.` };

  const job = jobs[0];
  const { data: items, error: itemError } = await supabase
    .from("pack_items")
    .select("*")
    .eq("job_id", job.id)
    .ilike("item_name", `%${itemHint}%`)
    .limit(3);

  if (itemError) return { ok: false, message: itemError.message };

  let packItem: PackItem | null = items?.[0] ?? null;
  const nextQuantity = (packItem?.quantity_planned ?? 0) + quantity;

  if (packItem) {
    const { data, error } = await supabase
      .from("pack_items")
      .update({ quantity_planned: nextQuantity, updated_at: new Date().toISOString() })
      .eq("id", packItem.id)
      .select()
      .single();
    if (error) return { ok: false, message: error.message };
    packItem = data;
  } else {
    const { data, error } = await supabase
      .from("pack_items")
      .insert({
        job_id: job.id,
        item_name: itemHint,
        quantity_planned: quantity,
        state: "planned",
        notes: "Added from Timbre Ops assistant"
      })
      .select()
      .single();
    if (error) return { ok: false, message: error.message };
    packItem = data;
  }

  const summary = `Added ${quantity} ${itemHint} to ${job.title} pack list`;
  await Promise.all([
    supabase.from("job_changes").insert({
      job_id: job.id,
      summary,
      detail: `${packItem.item_name} planned quantity is now ${packItem.quantity_planned}.`,
      source: "cameron",
      requires_attention: false
    }),
    supabase.from("activity_log").insert({
      job_id: job.id,
      action: "pack_item.updated",
      summary,
      source: "cameron",
      metadata: { item_id: packItem.id, quantity_added: quantity, quantity_planned: packItem.quantity_planned }
    })
  ]);

  return { ok: true, message: `${packItem.item_name} is now planned at ${packItem.quantity_planned} for ${job.title}.` };
}

async function upsertOperation(
  supabase: Client,
  owner: "Cameron" | "Beth",
  title: string,
  dueAt: string | null,
  raw: string
): Promise<AssistantResult> {
  const { data: matches, error: findError } = await supabase
    .from("operations")
    .select("*")
    .ilike("title", `%${title}%`)
    .neq("status", "done")
    .limit(1);

  if (findError) return { ok: false, message: findError.message };

  let operation: Operation;
  if (matches?.length) {
    const { data, error } = await supabase
      .from("operations")
      .update({
        owner,
        due_at: dueAt,
        status: "open",
        source: owner.toLowerCase() === "beth" ? "beth" : "cameron",
        notes: raw,
        updated_at: new Date().toISOString()
      })
      .eq("id", matches[0].id)
      .select()
      .single();
    if (error) return { ok: false, message: error.message };
    operation = data;
  } else {
    const { data, error } = await supabase
      .from("operations")
      .insert({
        title,
        owner,
        due_at: dueAt,
        status: "open",
        source: owner.toLowerCase() === "beth" ? "beth" : "cameron",
        notes: raw
      })
      .select()
      .single();
    if (error) return { ok: false, message: error.message };
    operation = data;
  }

  await supabase.from("activity_log").insert({
    operation_id: operation.id,
    action: matches?.length ? "operation.updated" : "operation.created",
    summary: `${operation.title} assigned to ${operation.owner ?? "the team"}`,
    source: operation.source,
    metadata: { due_at: operation.due_at, assistant_command: raw }
  });

  const due = operation.due_at ? ` due ${new Date(operation.due_at).toLocaleDateString("en-AU")}` : "";
  return { ok: true, message: `${operation.title} is assigned to ${operation.owner}${due}.` };
}
