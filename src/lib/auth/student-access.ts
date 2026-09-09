import { cache } from 'react'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'

export const getStudentAccountAccess = cache(async function getStudentAccountAccess() {
  if (!isSupabaseConfigured()) return false

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getClaims()
    return !error && Boolean(data?.claims?.sub)
  } catch {
    return false
  }
})
