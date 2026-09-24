import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { stripeContext } from '@/lib/stripe/config'
import { refreshBill, stripeBillRPC } from '@/lib/stripe/billing'

// Expire the provider session before releasing its reservation. The subsequent
// database transition locks the bill again, so a racing Checkout cannot also win.
export async function releasePackageCheckout(owner: string, id: string) {
  const { data: bill, error } = await createSupabaseAdminClient()
    .from('app_payments')
    .select(
      'package_id,status,stripe_checkout_key,stripe_checkout_session_id,stripe_payment_intent_id,stripe_account_id,stripe_livemode',
    )
    .eq('user_profile_id', owner)
    .eq('id', id)
    .single()
  if (error || !bill?.package_id || bill.status !== 'payment_due' || bill.stripe_payment_intent_id)
    throw new Error('Check the existing payment before changing this bill.')
  if (!bill.stripe_checkout_session_id) {
    if (bill.stripe_checkout_key)
      throw new Error('Checkout is still being prepared. Please try again shortly.')
    return
  }
  const ctx = await stripeContext()
  if (bill.stripe_account_id !== ctx.account || bill.stripe_livemode !== ctx.livemode)
    throw new Error('The bill belongs to another payment environment.')
  const session = await ctx.stripe.checkout.sessions.retrieve(bill.stripe_checkout_session_id)
  if (session.livemode !== ctx.livemode || session.client_reference_id !== id)
    throw new Error('The checkout needs review.')
  if (session.status === 'complete') {
    await refreshBill(owner, id, owner)
    throw new Error('This payment is being verified. Please do not pay again.')
  }
  if (session.status === 'open') await ctx.stripe.checkout.sessions.expire(session.id)
  else if (session.status !== 'expired') throw new Error('The checkout needs review.')
  await stripeBillRPC('expire_checkout', owner, id, { session: session.id })
}
