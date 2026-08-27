import 'server-only'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function isSupabaseAdminConfigured() {
  return Boolean(
    supabaseUrl &&
    serviceRoleKey &&
    !supabaseUrl.includes('your-project-ref') &&
    !serviceRoleKey.includes('your_service_role_key'),
  )
}

export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error('Supabase student administration is not configured.')
  }

  return createClient(supabaseUrl as string, serviceRoleKey as string, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
