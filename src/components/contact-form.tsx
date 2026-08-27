"use client";

import { FormEvent, useState } from "react";

type FormStatus =
  | { type: "idle"; message: "" }
  | { type: "success" | "error"; message: string };

export function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ type: "idle", message: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus({ type: "idle", message: "" });

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error || "We couldn't send your message.");
      }

      form.reset();
      setStatus({
        type: "success",
        message: "Thank you! Your message has been sent. We'll be in touch soon.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "We couldn't send your message. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          Parent or guardian name
          <input
            type="text"
            name="name"
            placeholder="Your name"
            autoComplete="name"
            maxLength={100}
            required
          />
        </label>
        <label>
          Email address
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Dancer&apos;s age
          <input
            type="text"
            name="age"
            placeholder="Age"
            inputMode="numeric"
            maxLength={30}
            required
          />
        </label>
        <label>
          Class interest
          <select name="interest" defaultValue="" required>
            <option value="" disabled>Select a program</option>
            <option>Level-Based Group Classes</option>
            <option>Technique &amp; Fundamentals</option>
            <option>Competition Solo &amp; Duet</option>
            <option>Seasonal Summer Camps</option>
            <option>Not sure — placement help</option>
          </select>
        </label>
      </div>
      <label>
        How can we help?
        <textarea
          name="message"
          rows={6}
          placeholder="Tell us what you're looking for"
          maxLength={3000}
          required
        />
      </label>
      <label className="contact-honeypot" aria-hidden="true">
        Website
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>
      <button className="button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send inquiry"}
      </button>
      <p
        className={`form-status${status.type === "idle" ? "" : ` form-status-${status.type}`}`}
        role="status"
        aria-live="polite"
      >
        {status.message || "We usually respond within one business day."}
      </p>
    </form>
  );
}
