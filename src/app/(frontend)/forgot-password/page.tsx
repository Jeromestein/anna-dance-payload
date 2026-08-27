import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <section className="auth-page">
      <div className="auth-brand-panel">
        <Link href="/" className="wordmark auth-wordmark" aria-label="Anna Dance Academy home">
          <BrandLogo />
        </Link>
        <div className="auth-brand-copy">
          <p className="eyebrow eyebrow-light">Student account</p>
          <h2>Return to the dance floor.</h2>
        </div>
      </div>

      <div className="auth-form-panel">
        <Link href="/" className="wordmark auth-mobile-wordmark" aria-label="Anna Dance Academy home">
          <BrandLogo />
        </Link>

        <article className="auth-card auth-card-simple">
          <header className="auth-card-header">
            <Link className="auth-back-link" href="/login" aria-label="Back to login">←</Link>
            <p className="eyebrow">Account recovery</p>
            <h1>Reset your password</h1>
            <p className="auth-card-copy">
              Enter your email address and we’ll send you a secure link to choose a new password.
            </p>
          </header>

          <ForgotPasswordForm />
        </article>
      </div>
    </section>
  );
}
