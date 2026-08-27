import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ResendConfirmationForm } from "./resend-confirmation-form";

export const metadata: Metadata = { title: "Resend Confirmation Email" };

export default function ResendConfirmationPage() {
  return (
    <section className="auth-page">
      <div className="auth-brand-panel">
        <Link href="/" className="wordmark auth-wordmark" aria-label="Anna Dance Academy home">
          <BrandLogo />
        </Link>
        <div className="auth-brand-copy">
          <p className="eyebrow eyebrow-light">Student account</p>
          <h2>Let’s get you confirmed.</h2>
        </div>
      </div>

      <div className="auth-form-panel">
        <Link href="/" className="wordmark auth-mobile-wordmark" aria-label="Anna Dance Academy home">
          <BrandLogo />
        </Link>

        <article className="auth-card auth-card-simple">
          <header className="auth-card-header">
            <Link className="auth-back-link" href="/login" aria-label="Back to login">←</Link>
            <p className="eyebrow">Email confirmation</p>
            <h1>Resend confirmation email</h1>
            <p className="auth-card-copy">
              Enter the email used to create your account. We’ll send a new confirmation link if
              the account is still waiting for verification.
            </p>
          </header>

          <ResendConfirmationForm />
        </article>
      </div>
    </section>
  );
}
