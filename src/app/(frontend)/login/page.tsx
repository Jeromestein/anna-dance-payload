import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { login, signup } from "./actions";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = { title: "Student Login" };

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    mode?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const isSignup = params.mode === "signup";

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();

    if (data?.claims?.sub) {
      redirect('/account')
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-brand-panel">
        <Link href="/" className="wordmark auth-wordmark" aria-label="Anna Dance Academy home">
          <BrandLogo />
        </Link>
        <div className="auth-brand-copy">
          <p className="eyebrow eyebrow-light">Student</p>
          <h2>Everything starts with a first step.</h2>
        </div>
      </div>

      <div className="auth-form-panel">
        <Link href="/" className="wordmark auth-mobile-wordmark" aria-label="Anna Dance Academy home">
          <BrandLogo />
        </Link>

        <article className="auth-card auth-card-simple">
          <header className="auth-card-header">
            {isSignup && <Link className="auth-back-link" href="/login" aria-label="Back to login">←</Link>}
            <p className="eyebrow">{isSignup ? "New Student" : "Student"}</p>
            <h1>{isSignup ? "Create your account" : "Log in"}</h1>
            <p className="auth-card-copy">
              {isSignup
                ? "Create the student’s account with Google or email. Contact information is optional."
                : "Continue with Google or use the email and password connected to your account."}
            </p>
          </header>

          {params.error && <p className="auth-alert auth-alert-error" role="alert">{params.error}</p>}
          {params.message && <p className="auth-alert auth-alert-success" role="status">{params.message}</p>}

          <GoogleSignInButton />
          <div className="auth-divider"><span>or continue with email</span></div>

          <form action={isSignup ? signup : login} className="auth-form">
            {isSignup && (
              <label htmlFor="student_name">
                Student name
                <input
                  id="student_name"
                  name="student_name"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  placeholder="Student’s full name"
                  required
                />
              </label>
            )}

            <label htmlFor="email">
              Email address
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                placeholder="you@example.com"
                required
              />
            </label>

            {isSignup && (
              <label htmlFor="student_phone">
                Phone number <span className="auth-field-optional">Optional</span>
                <input
                  id="student_phone"
                  name="student_phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={24}
                  placeholder="Student’s phone number"
                />
              </label>
            )}

            <label htmlFor="password">
              Password
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={8}
                maxLength={72}
                placeholder="At least 8 characters"
                required
              />
            </label>

            {!isSignup && (
              <div className="auth-help-links">
                <Link href="/resend-confirmation">Resend confirmation</Link>
                <Link href="/forgot-password">Forgot password?</Link>
              </div>
            )}

            {isSignup && (
              <fieldset className="auth-optional-contact">
                <legend>Parent/guardian contact <span>Optional</span></legend>
                <div className="auth-optional-fields">
                  <label htmlFor="guardian_name">
                    Name
                    <input
                      id="guardian_name"
                      name="guardian_name"
                      type="text"
                      autoComplete="off"
                      maxLength={100}
                      placeholder="Parent or guardian name"
                    />
                  </label>

                  <label htmlFor="guardian_phone">
                    Phone number
                    <input
                      id="guardian_phone"
                      name="guardian_phone"
                      type="tel"
                      autoComplete="off"
                      inputMode="tel"
                      maxLength={24}
                      placeholder="Parent or guardian phone"
                    />
                  </label>
                </div>
              </fieldset>
            )}

            <button className="button auth-submit" type="submit">
              {isSignup ? "Create account" : "Log in"}
            </button>
          </form>

          <div className="auth-secondary-action">
            <span>{isSignup ? "Already have an account?" : "New to Anna Dance Academy?"}</span>
            <Link className="button button-secondary" href={isSignup ? "/login" : "/login?mode=signup"}>
              {isSignup ? "Log in" : "Create an account"}
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
