"use server";

import type { AuthError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isValidEmail,
  isValidName,
  isValidOptionalName,
  isValidPassword,
  isValidPhone,
  normalizeEmail,
} from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type AuthMode = "login" | "signup";

function redirectToLogin(mode: AuthMode, type: "error" | "message", text: string): never {
  const params = new URLSearchParams({ mode, [type]: text });
  redirect(`/login?${params.toString()}`);
}

function readCredentials(formData: FormData, mode: AuthMode) {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!isValidEmail(email)) {
    redirectToLogin(mode, "error", "Enter a valid email address.");
  }

  if (!isValidPassword(password)) {
    redirectToLogin(mode, "error", "Password must be between 8 and 72 characters.");
  }

  return { email, password };
}

function readUserProfile(formData: FormData) {
  const studentName = String(formData.get("student_name") ?? "").trim();
  const studentPhone = String(formData.get("student_phone") ?? "").trim();
  const guardianName = String(formData.get("guardian_name") ?? "").trim();
  const guardianPhone = String(formData.get("guardian_phone") ?? "").trim();

  if (!isValidName(studentName)) {
    redirectToLogin("signup", "error", "Enter the student’s full name.");
  }

  if (studentPhone && !isValidPhone(studentPhone)) {
    redirectToLogin("signup", "error", "Enter a valid student phone number.");
  }

  if (!isValidOptionalName(guardianName)) {
    redirectToLogin("signup", "error", "Parent or guardian name is too long.");
  }

  if (guardianPhone && !isValidPhone(guardianPhone)) {
    redirectToLogin("signup", "error", "Enter a valid parent or guardian phone number.");
  }

  return {
    name: studentName,
    phone: studentPhone || null,
    guardian_name: guardianName || null,
    guardian_phone: guardianPhone || null,
  };
}

function authErrorMessage(error: AuthError, mode: AuthMode) {
  if (error.code === "email_not_confirmed") {
    return "Confirm your email before signing in.";
  }

  if (error.code === "invalid_credentials") {
    return "Email or password is incorrect.";
  }

  if (error.code === "over_email_send_rate_limit") {
    return "Please wait a moment before requesting another email.";
  }

  if (mode === "signup" && (error.code === "user_already_exists" || error.code === "email_exists")) {
    return "If an account can be created for this email, a confirmation message will arrive shortly.";
  }

  return mode === "login"
    ? "We could not sign you in. Please try again."
    : "We could not create the account. Please try again.";
}

function ensureConfigured(mode: AuthMode) {
  if (!isSupabaseConfigured()) {
    redirectToLogin(mode, "error", "Account access is being configured. Please try again shortly.");
  }
}

export async function login(formData: FormData) {
  const mode: AuthMode = "login";
  ensureConfigured(mode);
  const credentials = readCredentials(formData, mode);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    redirectToLogin(mode, "error", authErrorMessage(error, mode));
  }

  revalidatePath("/", "layout");
  redirect("/users/me");
}

export async function signup(formData: FormData) {
  const mode: AuthMode = "signup";
  ensureConfigured(mode);
  const credentials = readCredentials(formData, mode);
  const userProfile = readUserProfile(formData);
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: {
      data: userProfile,
      emailRedirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback`,
    },
  });

  if (error) {
    redirectToLogin(mode, "error", authErrorMessage(error, mode));
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/users/me");
  }

  redirectToLogin(
    mode,
    "message",
    "Check your email and follow the confirmation link to finish creating your account.",
  );
}
