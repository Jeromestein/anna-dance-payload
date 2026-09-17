import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { stripeAvailability } from '@/lib/stripe/config'
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
  const availability = stripeAvailability()
  const bills = ((data ?? []) as unknown as Bill[]).map((bill) => ({
    ...bill,
    checkout_available:
      availability.enabled &&
      bill.status === 'payment_due' &&
      (availability.mode === 'test'
        ? bill.stripe_livemode === false
        : bill.stripe_livemode !== false),
    refund_available:
      availability.enabled &&
      Boolean(bill.stripe_synced_at) &&
      bill.stripe_livemode === (availability.mode === 'live'),
    website_refunds_disabled:
      bill.payment_channel === 'stripe' && availability.mode === 'live' && !availability.enabled,
  }))
  return { bills: unavailable ? [] : bills, unavailable }
}
