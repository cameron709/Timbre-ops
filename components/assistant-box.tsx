"use client";

import { useMemo, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { runAssistantCommand } from "@/lib/assistant/actions";

export function AssistantBox({ onDone }: { onDone?: () => void }) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) return;

    setBusy(true);
    setResult(null);
    const response = await runAssistantCommand(supabase, text);
    setBusy(false);
    setResult(response.message);
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
    </form>
  );
}
