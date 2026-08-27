import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePayloadAdministrator } from '@/lib/staff/auth'
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin'
import { UserProfileForm, type EditableUserProfile, type UserRole } from '../user-profile-form'

export const metadata: Metadata = { title: 'User Profile' }
export const dynamic = 'force-dynamic'

type UserDetailPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; message?: string }>
}

type StoredUserProfile = {
  id: string
  email: string
  role: UserRole
  name: string
  phone: string | null
  guardian_name: string | null
  guardian_phone: string | null
}

export default async function UserDetailPage({ params, searchParams }: UserDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  await requirePayloadAdministrator()
  if (!isSupabaseAdminConfigured()) notFound()

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, role, name, phone, guardian_name, guardian_phone')
    .eq('id', id)
    .maybeSingle<StoredUserProfile>()

  if (error || !data) notFound()

  const profile: EditableUserProfile = {
    id: data.id,
    email: data.email,
    role: data.role,
    name: data.name,
    phone: data.phone,
    guardianName: data.guardian_name ?? '',
    guardianPhone: data.guardian_phone ?? '',
  }

  return (
    <UserProfileForm
      profile={profile}
      isEditingAnotherUser
      canManageUsers
      error={query.error}
      message={query.message}
    />
  )
}
