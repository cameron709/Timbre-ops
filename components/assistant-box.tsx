"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SendHorizonal } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";

export function AssistantBox({ onDone }: { onDone?: () => void }) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [responseResults, setResponseResults] = useState<{ id: string; title: string }[]>([]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;

    setBusy(true);
    setResult(null);
    setResponseResults([]);
    const { data } = await supabase.auth.getSession();
    const request = await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({ text })
    });
    const response = await request.json() as { ok: boolean; message: string; results?: { jobs?: { id: string; title: string }[] } };
    setBusy(false);
    setResult(response.message);
    setResponseResults(response.results?.jobs ?? []);
    if (response.ok) {
      setText("");
      onDone?.();
    }
  }

  return (
    <form className="assistant-box" onSubmit={submit}>
      <label htmlFor="assistant-input">What do you need?</label>
      <div className="assistant-input-row">
        <input
          id="assistant-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Add another DI to Mad Hatters"
          disabled={busy}
        />
        <button type="submit" aria-label="Run command" disabled={busy || !text.trim()}>
          <SendHorizonal size={18} />
        </button>
      </div>
      {result ? <p className="assistant-result">{result}</p> : null}
      {responseResults?.map((item) => <Link className="assistant-link" href={`/jobs/${item.id}`} key={item.id}>{item.title}</Link>)}
    </form>
  );
}
