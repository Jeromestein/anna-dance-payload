'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isValidName, isValidOptionalName, isValidPhone } from '@/lib/auth/validation'
import { requirePayloadAdministrator } from '@/lib/staff/auth'
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type UserRole = 'student' | 'admin'

function profilePath(userId: string, currentUserId: string) {
  return userId === currentUserId ? '/users/me' : `/users/${userId}`
}

function redirectToProfile(path: string, type: 'error' | 'message', text: string): never {
  const params = new URLSearchParams({ [type]: text })
  redirect(`${path}?${params.toString()}`)
}

function isUserRole(value: string): value is UserRole {
  return value === 'student' || value === 'admin'
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function updateUserProfile(formData: FormData) {
  const targetUserId = String(formData.get('target_user_id') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const guardianName = String(formData.get('guardian_name') ?? '').trim()
  const guardianPhone = String(formData.get('guardian_phone') ?? '').trim()

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const currentUserId = claimsData?.claims?.sub
  const authEmail = claimsData?.claims?.email

  if (claimsError || !currentUserId) {
    redirect('/login?error=Please+log+in+to+update+this+profile.')
  }

  if (!isUuid(targetUserId)) {
    redirectToProfile('/users/me', 'error', 'We could not identify the profile to update.')
  }

  const path = profilePath(targetUserId, currentUserId)

  if (targetUserId !== currentUserId) {
    redirectToProfile('/users/me', 'error', 'You can only update your own profile here.')
  }

  if (!isValidName(name)) {
    redirectToProfile(path, 'error', 'Enter the user’s full name.')
  }

  if (phone && !isValidPhone(phone)) {
    redirectToProfile(path, 'error', 'Enter a valid phone number.')
  }

  if (!isValidOptionalName(guardianName)) {
    redirectToProfile(path, 'error', 'Parent or guardian name is too long.')
  }

  if (guardianPhone && !isValidPhone(guardianPhone)) {
    redirectToProfile(path, 'error', 'Enter a valid parent or guardian phone number.')
  }

  const profileValues = {
    name,
    phone: phone || null,
    guardian_name: guardianName || null,
    guardian_phone: guardianPhone || null,
    updated_at: new Date().toISOString(),
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from('user_profiles')
    .update(profileValues)
    .eq('id', currentUserId)
    .select('id')
    .maybeSingle<{ id: string }>()

  if (updateError) {
    redirectToProfile(path, 'error', 'We could not save your profile. Please try again.')
  }

  if (!updatedProfile) {
    if (typeof authEmail !== 'string') {
      redirectToProfile(path, 'error', 'We could not save your profile. Please try again.')
    }

    const { error: insertError } = await supabase.from('user_profiles').insert({
      id: currentUserId,
      email: authEmail.toLowerCase(),
      role: 'student',
      ...profileValues,
    })

    if (insertError) {
      redirectToProfile(path, 'error', 'We could not save your profile. Please try again.')
    }
  }

  revalidatePath(path)
  revalidatePath('/users')
  revalidatePath('/', 'layout')
  redirectToProfile(path, 'message', 'The profile has been saved.')
}

export async function updateManagedUserProfile(formData: FormData) {
  await requirePayloadAdministrator()

  const targetUserId = String(formData.get('target_user_id') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const guardianName = String(formData.get('guardian_name') ?? '').trim()
  const guardianPhone = String(formData.get('guardian_phone') ?? '').trim()
  const requestedRole = String(formData.get('role') ?? '').trim()
  const path = `/users/${targetUserId}`

  if (!isUuid(targetUserId)) {
    redirectToProfile('/users', 'error', 'We could not identify the profile to update.')
  }
  if (!isSupabaseAdminConfigured()) {
    redirectToProfile(path, 'error', 'Student management is not configured yet.')
  }
  if (!isValidName(name)) {
    redirectToProfile(path, 'error', 'Enter the user’s full name.')
  }
  if (phone && !isValidPhone(phone)) {
    redirectToProfile(path, 'error', 'Enter a valid phone number.')
  }
  if (!isValidOptionalName(guardianName)) {
    redirectToProfile(path, 'error', 'Parent or guardian name is too long.')
  }
  if (guardianPhone && !isValidPhone(guardianPhone)) {
    redirectToProfile(path, 'error', 'Enter a valid parent or guardian phone number.')
  }
  if (!isUserRole(requestedRole)) {
    redirectToProfile(path, 'error', 'Choose a valid user role.')
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      name,
      phone: phone || null,
      guardian_name: guardianName || null,
      guardian_phone: guardianPhone || null,
      role: requestedRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetUserId)
    .select('id')
    .maybeSingle<{ id: string }>()

  if (error || !data) {
    redirectToProfile(path, 'error', 'We could not save this user’s profile. Please try again.')
  }

  revalidatePath(path)
  revalidatePath('/users')
  redirectToProfile(path, 'message', 'The profile has been saved.')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login?message=You+have+been+signed+out.')
}
