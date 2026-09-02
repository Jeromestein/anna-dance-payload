'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { isValidName, isValidOptionalName, isValidPhone } from '@/lib/auth/validation'
import { requirePayloadAdministrator } from '@/lib/staff/auth'
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type StudentProfileValues = {
  name: string
  phone: string | null
  guardian_name: string | null
  guardian_phone: string | null
  updated_at: string
}

function redirectWithStatus(path: string, type: 'error' | 'message', text: string): never {
  const params = new URLSearchParams({ [type]: text })
  redirect(`${path}?${params.toString()}`)
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function readStudentProfile(formData: FormData, path: string): StudentProfileValues {
  const name = String(formData.get('name') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const guardianName = String(formData.get('guardian_name') ?? '').trim()
  const guardianPhone = String(formData.get('guardian_phone') ?? '').trim()

  if (!isValidName(name)) {
    redirectWithStatus(path, 'error', 'Enter the student’s full name.')
  }
  if (phone && !isValidPhone(phone)) {
    redirectWithStatus(path, 'error', 'Enter a valid phone number.')
  }
  if (!isValidOptionalName(guardianName)) {
    redirectWithStatus(path, 'error', 'Parent or guardian name is too long.')
  }
  if (guardianPhone && !isValidPhone(guardianPhone)) {
    redirectWithStatus(path, 'error', 'Enter a valid parent or guardian phone number.')
  }

  return {
    name,
    phone: phone || null,
    guardian_name: guardianName || null,
    guardian_phone: guardianPhone || null,
    updated_at: new Date().toISOString(),
  }
}

export async function updateStudentProfile(formData: FormData) {
  const path = '/account'
  const targetStudentId = String(formData.get('target_student_id') ?? '').trim()
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const currentStudentId = claimsData?.claims?.sub
  const authEmail = claimsData?.claims?.email

  if (claimsError || !currentStudentId) {
    redirect('/login?error=Please+log+in+to+update+your+profile.')
  }
  if (!isUuid(targetStudentId)) {
    redirectWithStatus(path, 'error', 'We could not identify the profile to update.')
  }
  if (targetStudentId !== currentStudentId) {
    redirectWithStatus(path, 'error', 'You can only update your own profile.')
  }

  const profileValues = readStudentProfile(formData, path)
  const { data: updatedProfile, error: updateError } = await supabase
    .from('user_profiles')
    .update(profileValues)
    .eq('id', currentStudentId)
    .select('id')
    .maybeSingle<{ id: string }>()

  if (updateError) {
    redirectWithStatus(path, 'error', 'We could not save your profile. Please try again.')
  }

  if (!updatedProfile) {
    if (typeof authEmail !== 'string') {
      redirectWithStatus(path, 'error', 'We could not save your profile. Please try again.')
    }

    const { error: insertError } = await supabase.from('user_profiles').insert({
      id: currentStudentId,
      email: authEmail.toLowerCase(),
      role: 'student',
      ...profileValues,
    })

    if (insertError) {
      redirectWithStatus(path, 'error', 'We could not save your profile. Please try again.')
    }
  }

  revalidatePath(path)
  revalidatePath('/admin/students')
  revalidatePath('/', 'layout')
  redirectWithStatus(path, 'message', 'Your profile has been saved.')
}

export async function updateManagedStudentProfile(formData: FormData) {
  const targetStudentId = String(formData.get('target_student_id') ?? '').trim()
  const path = `/admin/students/${targetStudentId}`

  await requirePayloadAdministrator(path)

  if (!isUuid(targetStudentId)) {
    redirectWithStatus('/admin/students', 'error', 'We could not identify the Student to update.')
  }
  if (!isSupabaseAdminConfigured()) {
    redirectWithStatus(path, 'error', 'Student management is not configured yet.')
  }

  const profileValues = readStudentProfile(formData, path)
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .update(profileValues)
    .eq('id', targetStudentId)
    .select('id')
    .maybeSingle<{ id: string }>()

  if (error || !data) {
    redirectWithStatus(path, 'error', 'We could not save this Student. Please try again.')
  }

  revalidatePath(path)
  revalidatePath('/admin/students')
  redirectWithStatus(path, 'message', 'The Student profile has been saved.')
}

export async function logoutStudent() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login?message=You+have+been+signed+out.')
}
