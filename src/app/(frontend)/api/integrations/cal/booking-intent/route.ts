import { randomUUID } from 'node:crypto'

import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type StoredProfile = {
  email: string
  name: string
}

function readMetadataName(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') return ''
  const values = metadata as Record<string, unknown>

  for (const key of ['name', 'student_name', 'full_name', 'preferred_username']) {
    const value = values[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  return ''
}

export async function POST() {
  if (!isSupabaseConfigured()) {
    return Response.json({ status: 'unavailable' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  const authEmail =
    typeof claimsData?.claims?.email === 'string'
      ? claimsData.claims.email.trim().toLowerCase()
      : ''

  if (claimsError || !userId || !authEmail) {
    return Response.json(
      { status: 'public' },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }
  if (!process.env.CAL_WEBHOOK_SECRET?.trim()) {
    return Response.json({ status: 'unavailable' }, { status: 503 })
  }

  const { data: profile } = await supabase
    .from('app_user_profiles')
    .select('email, name')
    .eq('id', userId)
    .maybeSingle<StoredProfile>()

  const email = profile?.email?.trim().toLowerCase() || authEmail
  const name =
    profile?.name?.trim() ||
    readMetadataName(claimsData.claims.user_metadata) ||
    email.split('@')[0]
  const intentId = randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const { error: insertError } = await supabase.from('app_booking_intents').insert({
    id: intentId,
    user_profile_id: userId,
    expected_email: email,
    expires_at: expiresAt,
  })

  if (insertError) {
    return Response.json({ status: 'unavailable' }, { status: 503 })
  }

  return Response.json(
    {
      status: 'linked',
      intentId,
      name,
      email,
      expiresAt,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
