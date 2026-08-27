"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for this email, a password reset link will arrive shortly.";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/reset-password` },
    );

    setPending(false);

    if (resetError) {
      if (resetError.code === "over_email_send_rate_limit") {
        setError("Please wait a moment before requesting another email.");
      } else {
        setError("We could not send a reset email. Please try again.");
      }
      return;
    }

    setSubmitted(true);
  }

  return (
    <>
      {error && <p className="auth-alert auth-alert-error" role="alert">{error}</p>}
      {submitted && (
        <p className="auth-alert auth-alert-success" role="status">
          {GENERIC_SUCCESS_MESSAGE}
        </p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="recovery_email">
          Email address
          <input
            id="recovery_email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
            required
          />
        </label>

        <button className="button auth-submit" type="submit" disabled={pending}>
          {pending ? "Sending…" : submitted ? "Send another email" : "Send reset link"}
        </button>
      </form>

      <p className="auth-switch">
        Remember your password? <Link href="/login">Back to login</Link>
      </p>
    </>
  );
}
