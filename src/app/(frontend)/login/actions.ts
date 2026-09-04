'use server'

import type { AuthError } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  isValidEmail,
  isValidName,
  isValidOptionalName,
  isValidPassword,
  isValidPhone,
  normalizeEmail,
} from '@/lib/auth/validation'
import { getSafeNextPath } from '@/lib/auth/redirects'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

type AuthMode = 'login' | 'signup'

function redirectToLogin(
  mode: AuthMode,
  type: 'error' | 'message',
  text: string,
  nextPath = '/account',
): never {
  const params = new URLSearchParams({ mode, [type]: text, next: nextPath })
  redirect(`/login?${params.toString()}`)
}

function readCredentials(formData: FormData, mode: AuthMode, nextPath: string) {
  const email = normalizeEmail(String(formData.get('email') ?? ''))
  const password = String(formData.get('password') ?? '')

  if (!isValidEmail(email)) {
    redirectToLogin(mode, 'error', 'Enter a valid email address.', nextPath)
  }

  if (!isValidPassword(password)) {
    redirectToLogin(mode, 'error', 'Password must be between 8 and 72 characters.', nextPath)
  }

  return { email, password }
}

function readUserProfile(formData: FormData, nextPath: string) {
  const studentName = String(formData.get('student_name') ?? '').trim()
  const studentPhone = String(formData.get('student_phone') ?? '').trim()
  const guardianName = String(formData.get('guardian_name') ?? '').trim()
  const guardianPhone = String(formData.get('guardian_phone') ?? '').trim()

  if (!isValidName(studentName)) {
    redirectToLogin('signup', 'error', 'Enter the student’s full name.', nextPath)
  }

  if (studentPhone && !isValidPhone(studentPhone)) {
    redirectToLogin('signup', 'error', 'Enter a valid student phone number.', nextPath)
  }

  if (!isValidOptionalName(guardianName)) {
    redirectToLogin('signup', 'error', 'Parent or guardian name is too long.', nextPath)
  }

  if (guardianPhone && !isValidPhone(guardianPhone)) {
    redirectToLogin('signup', 'error', 'Enter a valid parent or guardian phone number.', nextPath)
  }

  return {
    name: studentName,
    phone: studentPhone || null,
    guardian_name: guardianName || null,
    guardian_phone: guardianPhone || null,
  }
}

function authErrorMessage(error: AuthError, mode: AuthMode) {
  if (error.code === 'email_not_confirmed') {
    return 'Confirm your email before signing in.'
  }

  if (error.code === 'invalid_credentials') {
    return 'Email or password is incorrect.'
  }

  if (error.code === 'over_email_send_rate_limit') {
    return 'Please wait a moment before requesting another email.'
  }

  if (
    mode === 'signup' &&
    (error.code === 'user_already_exists' || error.code === 'email_exists')
  ) {
    return 'If an account can be created for this email, a confirmation message will arrive shortly.'
  }

  return mode === 'login'
    ? 'We could not sign you in. Please try again.'
    : 'We could not create the account. Please try again.'
}

function ensureConfigured(mode: AuthMode, nextPath: string) {
  if (!isSupabaseConfigured()) {
    redirectToLogin(
      mode,
      'error',
      'Account access is being configured. Please try again shortly.',
      nextPath,
    )
  }
}

export async function login(formData: FormData) {
  const mode: AuthMode = 'login'
  const nextPath = getSafeNextPath(formData.get('next'))
  ensureConfigured(mode, nextPath)
  const credentials = readCredentials(formData, mode, nextPath)
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(credentials)

  if (error) {
    redirectToLogin(mode, 'error', authErrorMessage(error, mode), nextPath)
  }

  revalidatePath('/', 'layout')
  redirect(nextPath)
}

export async function signup(formData: FormData) {
  const mode: AuthMode = 'signup'
  const nextPath = getSafeNextPath(formData.get('next'))
  ensureConfigured(mode, nextPath)
  const credentials = readCredentials(formData, mode, nextPath)
  const userProfile = readUserProfile(formData, nextPath)
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data, error } = await supabase.auth.signUp({
    ...credentials,
    options: {
      data: userProfile,
      emailRedirectTo: `${siteUrl.replace(/\/$/, '')}/auth/callback?next=${encodeURIComponent(nextPath)}`,
    },
  })

  if (error) {
    redirectToLogin(mode, 'error', authErrorMessage(error, mode), nextPath)
  }

  if (data.session) {
    revalidatePath('/', 'layout')
    redirect(nextPath)
  }

  redirectToLogin(
    mode,
    'message',
    'Check your email and follow the confirmation link to finish creating your account.',
    nextPath,
  )
}
