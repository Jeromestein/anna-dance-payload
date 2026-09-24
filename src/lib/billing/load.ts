import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { stripeAvailability } from '@/lib/stripe/config'
import { type Bill } from './model'
import { queryBilling } from './query.server'

export async function loadBills(client: SupabaseClient, owner: string) {
  const { data, error, count } = await queryBilling((columns) =>
    client
      .from('app_payments')
      .select(columns, { count: 'exact' })
      .eq('user_profile_id', owner)
      .order('created_at', { ascending: false })
      .limit(500),
  )
  // Never report a balance calculated from silently truncated history.
  const unavailable = Boolean(error) || (count ?? 0) > (data?.length ?? 0)
  const availability = stripeAvailability()
  const bills = ((data ?? []) as unknown as Bill[]).map((bill) => decorateBill(bill, availability))
  return { bills: unavailable ? [] : bills, unavailable }
}

function decorateBill(bill: Bill, availability = stripeAvailability()): Bill {
  return {
    ...bill,
    checkout_available:
      availability.enabled &&
      bill.payment_preference !== 'cash' &&
      bill.status === 'payment_due' &&
      bill.currency === 'usd' &&
      bill.amount_cents >= 50 &&
      (availability.mode === 'test'
        ? bill.stripe_livemode === false
        : bill.stripe_livemode !== false),
    refund_available:
      availability.refundEnabled &&
      Boolean(bill.stripe_synced_at) &&
      bill.stripe_livemode === (availability.mode === 'live'),
    website_refunds_disabled:
      bill.payment_channel === 'stripe' &&
      availability.mode === 'live' &&
      !availability.refundEnabled,
  }
}

export async function loadBill(client: SupabaseClient, owner: string, id: string) {
  const { data, error } = await queryBilling((columns) =>
    client
      .from('app_payments')
      .select(columns)
      .eq('user_profile_id', owner)
      .eq('id', id)
      .maybeSingle(),
  )
  return {
    bill: data && !error ? decorateBill(data as unknown as Bill) : null,
    unavailable: Boolean(error),
  }
}
