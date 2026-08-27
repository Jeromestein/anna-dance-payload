"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  getResendConfirmationOutcome,
} from "@/lib/auth/resend-confirmation";
import { isValidEmail, normalizeEmail } from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/client";

export function ResendConfirmationForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setSubmitted(false);
      setMessage("");
      setError("Enter a valid email address.");
      return;
    }

    setPending(true);
    setSubmitted(false);
    setMessage("");
    setError("");

    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      const outcome = getResendConfirmationOutcome(resendError?.code);
      if (outcome.kind === "error") {
        setError(outcome.message);
        return;
      }

      setSubmitted(true);
      setMessage(outcome.message);
    } catch {
      setError("We could not reach the email service. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {error && <p className="auth-alert auth-alert-error" role="alert">{error}</p>}
      {submitted && message && (
        <p className="auth-alert auth-alert-success" role="status">
          {message}
        </p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="confirmation_email">
          Email address
          <input
            id="confirmation_email"
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
          {pending
            ? "Sending…"
            : submitted
              ? "Send another email"
              : "Resend confirmation email"}
        </button>
      </form>

      <p className="auth-switch">
        Already confirmed? <Link href="/login">Back to login</Link>
      </p>
    </>
  );
}
