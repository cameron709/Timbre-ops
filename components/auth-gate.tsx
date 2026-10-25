"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Mail, KeyRound } from "lucide-react";
import { createBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { BrandMark } from "@/components/brand-mark";

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
  const [recovering, setRecovering] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
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

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setPasswordRecovery(true);
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
          <BrandMark className="auth-brand" />
          <h1>Operations</h1>
          <p>Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to run against Supabase.</p>
        </section>
      </main>
    );
  }

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : null);
  }

  async function recoverPassword() {
    setRecovering(true);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });
    setRecovering(false);
    setMessage(error ? error.message : "Password reset email sent. You only need this if you have forgotten your password.");
  }

  if (loading) {
    return <main className="center-screen">Loading Timbre Ops...</main>;
  }

  async function updateRecoveredPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage(error.message);
      return;
    }
    setPasswordRecovery(false);
    setNewPassword("");
    setMessage("Password updated.");
  }

  if (passwordRecovery && session) {
    return (
      <main className="auth-screen">
        <section className="auth-panel" aria-label="Set new password">
          <BrandMark className="auth-brand" />
          <h1>Set a new password</h1>
          <p>Choose the password you will use for normal Timbre Ops sign-in.</p>
          <form onSubmit={updateRecoveredPassword} className="auth-form">
            <label>
              New password
              <span>
                <KeyRound size={16} />
                <input
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </span>
            </label>
            <button type="submit">Save password</button>
          </form>
          {message ? <p className="form-message">{message}</p> : null}
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="auth-screen">
        <section className="auth-panel" aria-label="Sign in">
          <BrandMark className="auth-brand" />
          <h1>Operations</h1>
          <p>Sign in with your Timbre Ops email and password.</p>
          <form onSubmit={signIn} className="auth-form">
            <label>
              Email
              <span>
                <Mail size={16} />
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
              </span>
            </label>
            <label>
              Password
              <span>
                <KeyRound size={16} />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </span>
            </label>
            <button type="submit">Sign in</button>
          </form>
          <button className="text-button" type="button" onClick={recoverPassword} disabled={recovering || !email}>
            {recovering ? "Sending reset email..." : "Forgot password?"}
          </button>
          {message ? <p className="form-message">{message}</p> : null}
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
