"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { EmptyState, Pill } from "@/components/ui";
import { formatDateTime, statusLabel } from "@/lib/format";
import { operationStatuses } from "@/lib/status";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Operation } from "@/types/database";

type OperationDraft = {
  title: string;
  owner: "Cameron" | "Beth";
  due_at: string;
  status: Operation["status"];
  notes: string;
};

const blankOperation: OperationDraft = {
  title: "",
  owner: "Cameron" as const,
  due_at: "",
  status: "open" as const,
  notes: ""
};

export default function OpsPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [draft, setDraft] = useState(blankOperation);
  const [editing, setEditing] = useState<Operation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("operations").select("*").order("status").order("due_at", { ascending: true, nullsFirst: false });
    setOperations(data ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    const payload = {
      title: draft.title,
      owner: draft.owner,
      due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null,
      status: draft.status,
      notes: draft.notes || null,
      source: draft.owner.toLowerCase() === "beth" ? "beth" as const : "cameron" as const,
      updated_at: new Date().toISOString()
    };

    const result = editing
      ? await supabase.from("operations").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("operations").insert(payload).select().single();

    if (result.error) {
      setNotice(result.error.message);
      return;
    }

    await supabase.from("activity_log").insert({
      operation_id: result.data.id,
      action: editing ? "operation.updated" : "operation.created",
      summary: `${result.data.title} assigned to ${result.data.owner ?? "the team"}`,
      source: result.data.source,
      metadata: { due_at: result.data.due_at }
    });

    setDraft(blankOperation);
    setEditing(null);
    setNotice("Operation saved.");
    load();
  }

  function beginEdit(operation: Operation) {
    setEditing(operation);
    setDraft({
      title: operation.title,
      owner: operation.owner ?? "Cameron",
      due_at: toLocalInput(operation.due_at),
      status: operation.status,
      notes: operation.notes ?? ""
    });
  }

  async function complete(operation: Operation) {
    const { error } = await supabase
      .from("operations")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", operation.id);
    setNotice(error ? error.message : "Operation completed.");
    load();
  }

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <h1>Ops</h1>
          <p>General business work that is not always tied to a job.</p>
        </div>
      </header>

      <section className="detail-panel">
        <form className="form-grid" onSubmit={submit}>
          <div className="section-head">
            <h2>{editing ? "Edit Operation" : "New Operation"}</h2>
            <Plus size={18} />
          </div>
          <label>
            Title
            <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
          </label>
          <div className="form-grid two">
            <label>
              Owner
              <select value={draft.owner} onChange={(event) => setDraft({ ...draft, owner: event.target.value as "Cameron" | "Beth" })}>
                <option value="Cameron">Cameron</option>
                <option value="Beth">Beth</option>
              </select>
            </label>
            <label>
              Status
              <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Operation["status"] })}>
                {operationStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
            </label>
          </div>
          <label>
            Due
            <input type="datetime-local" value={draft.due_at} onChange={(event) => setDraft({ ...draft, due_at: event.target.value })} />
          </label>
          <label>
            Notes
            <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </label>
          <button type="submit">{editing ? "Save changes" : "Create operation"}</button>
          {editing ? <button className="text-button" type="button" onClick={() => { setEditing(null); setDraft(blankOperation); }}>Cancel edit</button> : null}
          {notice ? <p className="form-message">{notice}</p> : null}
        </form>
      </section>

      <section className="list">
        {!operations.length ? <EmptyState icon={CheckCircle2} title="No operations visible" body="Create the first item or check RLS access." /> : null}
        {operations.map((operation) => (
          <article className="card" key={operation.id}>
            <div className="card-row">
              <h2>{operation.title}</h2>
              <Pill tone={operation.status === "done" ? "good" : operation.status === "waiting" ? "warn" : "neutral"}>{statusLabel(operation.status)}</Pill>
            </div>
            <p className="meta">{operation.owner ?? "Team"} {operation.due_at ? `· ${formatDateTime(operation.due_at)}` : "· No due date"}</p>
            {operation.notes ? <p>{operation.notes}</p> : null}
            <div className="filter-row">
              <button type="button" onClick={() => beginEdit(operation)}>Edit</button>
              {operation.status !== "done" ? <button type="button" onClick={() => complete(operation)}>Complete</button> : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}
