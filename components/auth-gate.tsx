"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Lock, Mail, KeyRound } from "lucide-react";
import { createBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

type AuthGateProps = {
  children: React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("cameron@timbrepa.com.au");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<"password" | "link">("password");
  const configured = hasSupabaseConfig();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [configured, supabase]);

  if (!configured) {
    return (
      <main className="auth-screen">
        <section className="auth-panel" aria-label="Configuration required">
          <div className="brand-lock">
            <Lock size={20} />
          </div>
          <h1>Timbre Ops</h1>
          <p>Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to run against Supabase.</p>
        </section>
      </main>
    );
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (mode === "link") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      setMessage(error ? error.message : "Check your email for the sign-in link.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : null);
  }

  if (loading) {
    return <main className="center-screen">Loading Timbre Ops...</main>;
  }

  if (!session) {
    return (
      <main className="auth-screen">
        <section className="auth-panel" aria-label="Sign in">
          <div className="brand-lock">
            <Lock size={20} />
          </div>
          <h1>Timbre Ops</h1>
          <p>Sign in with Supabase Auth to access live operations data.</p>
          <form onSubmit={signIn} className="auth-form">
            <label>
              Email
              <span>
                <Mail size={16} />
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
              </span>
            </label>
            {mode === "password" ? (
              <label>
                Password
                <span>
                  <KeyRound size={16} />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    autoComplete="current-password"
                  />
                </span>
              </label>
            ) : null}
            <button type="submit">{mode === "password" ? "Sign in" : "Send sign-in link"}</button>
          </form>
          <button className="text-button" type="button" onClick={() => setMode(mode === "password" ? "link" : "password")}>
            {mode === "password" ? "Use email link instead" : "Use password instead"}
          </button>
          {message ? <p className="form-message">{message}</p> : null}
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
