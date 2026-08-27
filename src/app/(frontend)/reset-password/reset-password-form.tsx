"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { isValidPassword } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function establishRecoverySession() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const code = url.searchParams.get("code");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const providerError = url.searchParams.get("error") || hash.get("error");

      if (providerError) {
        if (active) setInvalidLink(true);
        return;
      }

      if ((!accessToken || !refreshToken) && !code) {
        setInvalidLink(true);
        return;
      }

      const supabase = createClient({ detectSessionInUrl: false });

      let sessionError = null;
      let hasSession = false;

      if (accessToken && refreshToken) {
        const result = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        sessionError = result.error;
        hasSession = Boolean(result.data.session);
      } else if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        sessionError = result.error;
        hasSession = Boolean(result.data.session);
      }

      if (!active) return;

      if (sessionError || !hasSession) {
        setInvalidLink(true);
        return;
      }

      window.history.replaceState({}, document.title, "/reset-password");
      setReady(true);
    }

    void establishRecoverySession();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isValidPassword(password)) {
      setError("Your password must be between 8 and 72 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    const supabase = createClient({ detectSessionInUrl: false });
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setPending(false);
      setError("We could not update your password. Please request a new reset link.");
      return;
    }

    await supabase.auth.signOut({ scope: "global" });
    window.location.replace(
      "/login?message=Your+password+has+been+updated.+Log+in+with+your+new+password.",
    );
  }

  if (invalidLink) {
    return (
      <>
        <p className="auth-alert auth-alert-error" role="alert">
          This password reset link is invalid or has expired.
        </p>
        <Link className="button auth-submit" href="/forgot-password">Request a new link</Link>
        <p className="auth-switch"><Link href="/login">Back to login</Link></p>
      </>
    );
  }

  if (!ready) {
    return <p className="auth-recovery-status" role="status">Checking your reset link…</p>;
  }

  return (
    <>
      {error && <p className="auth-alert auth-alert-error" role="alert">{error}</p>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="new_password">
          New password
          <input
            id="new_password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
            required
          />
        </label>

        <label htmlFor="confirm_password">
          Confirm new password
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            placeholder="Enter the password again"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={pending}
            required
          />
        </label>

        <button className="button auth-submit" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save new password"}
        </button>
      </form>
    </>
  );
}
