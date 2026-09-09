import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { billSelect, type Bill } from './model'

export async function loadBills(client: SupabaseClient, owner: string) {
  const { data, error, count } = await client
    .from('app_payments')
    .select(billSelect, { count: 'exact' })
    .eq('user_profile_id', owner)
    .order('created_at', { ascending: false })
    .limit(500)
  // Never report a balance calculated from silently truncated history.
  const unavailable = Boolean(error) || (count ?? 0) > (data?.length ?? 0)
  return { bills: unavailable ? [] : ((data ?? []) as unknown as Bill[]), unavailable }
}
