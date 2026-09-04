import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { StudentAccountDashboard } from '@/components/student-account-dashboard'
import type { EditableStudentProfile } from '@/components/student-profile-form'
import { getMockStudentAccount } from '@/lib/account/mock-student-account'
import { mapStoredScheduleEntry } from '@/lib/account/schedule'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'My Account' }

type AccountPageProps = {
  searchParams: Promise<{
    error?: string
    message?: string
  }>
}

type StoredStudentProfile = {
  email: string
  name: string
  phone: string | null
  guardian_name: string | null
  guardian_phone: string | null
}

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== 'object') return ''
  const value = (metadata as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams

  if (!isSupabaseConfigured()) {
    redirect('/login?error=Student+access+is+being+configured.')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const studentId = data?.claims?.sub

  if (error || !studentId) {
    redirect('/login?error=Please+log+in+to+view+your+profile.')
  }

  const authEmail = typeof data.claims.email === 'string' ? data.claims.email : 'Verified email'
  const metadata = data.claims.user_metadata
  const { data: storedProfile, error: profileError } = await supabase
    .from('app_user_profiles')
    .select('email, name, phone, guardian_name, guardian_phone')
    .eq('id', studentId)
    .maybeSingle<StoredStudentProfile>()
  const { data: storedSchedule, error: scheduleError } = await supabase
    .from('app_schedule_entries')
    .select('id, entry_type, title, starts_at, ends_at, timezone, location, status, source')
    .eq('user_profile_id', studentId)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(50)

  const profile: EditableStudentProfile = {
    id: studentId,
    email: storedProfile?.email ?? authEmail,
    name:
      storedProfile?.name ??
      (getMetadataString(metadata, 'name') ||
        getMetadataString(metadata, 'student_name') ||
        getMetadataString(metadata, 'full_name') ||
        authEmail.split('@')[0]),
    phone:
      storedProfile?.phone ??
      (getMetadataString(metadata, 'phone') || getMetadataString(metadata, 'student_phone')),
    guardianName: storedProfile?.guardian_name ?? getMetadataString(metadata, 'guardian_name'),
    guardianPhone: storedProfile?.guardian_phone ?? getMetadataString(metadata, 'guardian_phone'),
  }

  return (
    <StudentAccountDashboard
      account={getMockStudentAccount()}
      profile={profile}
      scheduleEntries={(storedSchedule ?? []).map(mapStoredScheduleEntry)}
      scheduleLoadError={Boolean(scheduleError)}
      error={params.error}
      message={params.message}
      profileLoadError={Boolean(profileError)}
    />
  )
}
