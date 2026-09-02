import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a New Password" };

export default function ResetPasswordPage() {
  return (
    <section className="auth-page">
      <div className="auth-brand-panel">
        <Link href="/" className="wordmark auth-wordmark" aria-label="Anna Dance Academy home">
          <BrandLogo />
        </Link>
        <div className="auth-brand-copy">
          <p className="eyebrow eyebrow-light">Student</p>
          <h2>Choose a fresh start.</h2>
        </div>
      </div>

      <div className="auth-form-panel">
        <Link href="/" className="wordmark auth-mobile-wordmark" aria-label="Anna Dance Academy home">
          <BrandLogo />
        </Link>

        <article className="auth-card auth-card-simple">
          <header className="auth-card-header">
            <p className="eyebrow">Account recovery</p>
            <h1>Choose a new password</h1>
            <p className="auth-card-copy">
              Use at least 8 characters. You’ll return to the login page after saving it.
            </p>
          </header>

          <ResetPasswordForm />
        </article>
      </div>
    </section>
  );
}
