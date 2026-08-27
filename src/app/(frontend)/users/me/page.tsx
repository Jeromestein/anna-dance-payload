import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { UserProfileForm, type EditableUserProfile, type UserRole } from '../user-profile-form'

export const metadata: Metadata = { title: 'Profile' }

type MyProfilePageProps = {
  searchParams: Promise<{
    error?: string
    message?: string
  }>
}

type StoredUserProfile = {
  email: string
  role: UserRole
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

export default async function MyProfilePage({ searchParams }: MyProfilePageProps) {
  const params = await searchParams

  if (!isSupabaseConfigured()) {
    redirect('/login?error=Account+access+is+being+configured.')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub

  if (error || !userId) {
    redirect('/login?error=Please+log+in+to+view+your+profile.')
  }

  const authEmail =
    typeof data.claims.email === 'string' ? data.claims.email : 'Your verified email'
  const metadata = data.claims.user_metadata
  const { data: storedProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('email, role, name, phone, guardian_name, guardian_phone')
    .eq('id', userId)
    .maybeSingle<StoredUserProfile>()

  const profile: EditableUserProfile = {
    id: userId,
    email: storedProfile?.email ?? authEmail,
    role: storedProfile?.role ?? 'student',
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
    <UserProfileForm
      profile={profile}
      isEditingAnotherUser={false}
      canManageUsers={false}
      error={params.error}
      message={params.message}
      profileLoadError={Boolean(profileError)}
    />
  )
}
