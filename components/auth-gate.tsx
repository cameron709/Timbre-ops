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
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const configured = hasSupabaseConfig();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setSession(data.session);
      if (error) setMessage(error.message);
      setLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setMessage("Unable to connect. Check your connection and try again.");
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

    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setMessage(error ? error.message : null);
    } catch {
      setMessage("Unable to connect. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function recoverPassword() {
    setRecovering(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });
      setMessage(error ? error.message : "If this email has an account, a password reset link is on its way. Choose your own password, then use it for future sign-ins.");
    } catch {
      setMessage("Unable to send the reset link. Check your connection and try again.");
    } finally {
      setRecovering(false);
    }
  }

  if (loading) {
    return <main className="center-screen">Loading Timbre Ops...</main>;
  }

  async function updateRecoveredPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (newPassword !== confirmation) {
      setMessage("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setMessage(error.message);
        return;
      }
      setPasswordRecovery(false);
      setNewPassword("");
      setConfirmation("");
      setMessage(null);
    } catch {
      setMessage("Unable to save your password. Please try again.");
    } finally {
      setBusy(false);
    }
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
            <label>
              Confirm password
              <span><KeyRound size={16} /><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} type="password" autoComplete="new-password" required minLength={8} /></span>
            </label>
            <button type="submit" disabled={busy}>{busy ? "Saving..." : "Save password"}</button>
          </form>
          {message ? <p className="form-message" role="status">{message}</p> : null}
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
                <input value={email} onChange={(event) => setEmail(event.target.value)} name="email" autoComplete="username" type="email" required />
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
            <button type="submit" disabled={busy || recovering}>{busy ? "Signing in..." : "Sign in"}</button>
          </form>
          <button className="text-button" type="button" onClick={recoverPassword} disabled={busy || recovering || !email.trim()}>
            {recovering ? "Sending reset email..." : "Forgot password?"}
          </button>
          {message ? <p className="form-message" role="status">{message}</p> : null}
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
