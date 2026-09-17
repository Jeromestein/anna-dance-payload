import 'server-only'
import { randomUUID } from 'node:crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { stripeContext, siteOrigin } from './config'
import { paymentSnapshot } from './snapshot'

type Context = Awaited<ReturnType<typeof stripeContext>>
type StoredBill = {
  id: string
  user_profile_id: string
  amount_cents: number
  currency: string
  status: string
  stripe_account_id: string | null
  stripe_livemode: boolean | null
  stripe_payment_intent_id: string | null
  stripe_checkout_key: string | null
  stripe_checkout_session_id: string | null
  stripe_checkout_started_at: string | null
  refund_request_key: string | null
  refund_requested_at: string | null
  refund_reason: string | null
  refund_state: string
  transaction_reference: string | null
}
const storedSelect =
  'id,user_profile_id,amount_cents,currency,status,stripe_account_id,stripe_livemode,stripe_payment_intent_id,stripe_checkout_key,stripe_checkout_session_id,stripe_checkout_started_at,refund_request_key,refund_requested_at,refund_reason,refund_state,transaction_reference'
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function stripeBillRPC(
  operation: string,
  owner: string,
  id: string,
  data: Record<string, unknown>,
): Promise<StoredBill> {
  const result = await createSupabaseAdminClient().rpc('app_stripe_bill', {
    p_operation: operation,
    p_owner: owner,
    p_id: id,
    p_data: data,
  })
  if (result.error || !result.data)
    throw new Error(
      'Billing could not be updated. Refresh and check the payment before trying again.',
    )
  return result.data as StoredBill
}
async function getBill(owner: string, id: string) {
  const result = await createSupabaseAdminClient()
    .from('app_payments')
    .select(storedSelect)
    .eq('id', id)
    .eq('user_profile_id', owner)
    .single<StoredBill>()
  if (result.error || !result.data) throw new Error('Bill not found.')
  return result.data
}
function assertEnvironment(bill: StoredBill, ctx: Context) {
  if (bill.stripe_account_id !== ctx.account || bill.stripe_livemode !== ctx.livemode)
    throw new Error(
      'This payment belongs to a different Stripe environment. Switch to its configured environment before continuing.',
    )
}
export async function readPayment(ctx: Context, id: string) {
  if (!/^pi_[A-Za-z0-9]+$/.test(id)) throw new Error('Enter a valid Stripe PaymentIntent ID.')
  const observedAt = new Date().toISOString()
  const pi = await ctx.stripe.paymentIntents.retrieve(id, { expand: ['latest_charge'] })
  if (pi.livemode !== ctx.livemode || !pi.latest_charge || typeof pi.latest_charge === 'string')
    throw new Error('The payment does not match this environment or has no completed charge.')
  const charge = pi.latest_charge
  const refundPage = await ctx.stripe.refunds.list({ payment_intent: pi.id, limit: 100 })
  if (refundPage.has_more) throw new Error('Refund history requires manual reconciliation.')
  const snapshot = paymentSnapshot(pi, charge, refundPage.data)
  return { pi, charge, snapshot, observedAt }
}

export async function synchronizePayment(
  ctx: Context,
  id: string,
  options: {
    eventId?: string
    importOwner?: string
    actor?: string
    description?: string
    expectedOwner?: string
  } = {},
) {
  const evidence = await readPayment(ctx, id)
  const { pi, snapshot, observedAt, charge } = evidence
  const db = createSupabaseAdminClient()
  // All matching paths use a provider ID, a server-created checkout token, or a
  // signed Cal booking ID plus attendee identity. Never associate by amount/name.
  const found = await db
    .from('app_payments')
    .select(storedSelect)
    .eq('payment_channel', 'stripe')
    .eq('transaction_reference', pi.id)
    .maybeSingle<StoredBill>()
  if (found.error) throw new Error('Could not look up the payment.')
  let bill = found.data
  let owner = bill?.user_profile_id
  let billId = bill?.id
  let calBookingId: string | null = null
  let description = options.description
  if (!bill && pi.metadata.ada_bill_id) {
    if (
      !uuidPattern.test(pi.metadata.ada_bill_id) ||
      !uuidPattern.test(pi.metadata.ada_checkout_key ?? '')
    )
      throw new Error('Invalid checkout association.')
    const lookup = await db
      .from('app_payments')
      .select(storedSelect)
      .eq('id', pi.metadata.ada_bill_id)
      .single<StoredBill>()
    if (
      lookup.error ||
      !lookup.data ||
      lookup.data.stripe_checkout_key !== pi.metadata.ada_checkout_key
    )
      throw new Error('The checkout does not match a reserved bill.')
    bill = lookup.data
    owner = bill.user_profile_id
    billId = bill.id
  }
  if (!bill && pi.metadata.identifier === 'cal.com' && /^\d+$/.test(pi.metadata.bookingId ?? '')) {
    const email = pi.metadata.bookerEmail?.trim().toLowerCase()
    if (!email) throw new Error('Cal payment needs attendee verification.')
    const matched = await db
      .from('app_schedule_entries')
      .select('user_profile_id,title,attendee_email')
      .eq('cal_booking_id', pi.metadata.bookingId)
      .eq('match_status', 'linked')
      .eq('attendee_email', email)
      .limit(2)
    if (matched.error) throw new Error('Could not look up the booking.')
    if (matched.data?.length === 1 && matched.data[0].user_profile_id) {
      owner = matched.data[0].user_profile_id
      calBookingId = pi.metadata.bookingId
      description = matched.data[0].title
    }
  }
  if (options.importOwner) {
    if (owner && owner !== options.importOwner)
      throw new Error('This payment belongs to another student.')
    if (!owner) {
      // A staff-confirmed historical import still needs matching provider email.
      const profile = await db
        .from('app_user_profiles')
        .select('email')
        .eq('id', options.importOwner)
        .single<{ email: string }>()
      const providerEmails = [
        charge.billing_details.email,
        pi.receipt_email,
        pi.metadata.identifier === 'cal.com' ? pi.metadata.bookerEmail : null,
      ]
        .filter(Boolean)
        .map((e) => e!.trim().toLowerCase())
      if (
        profile.error ||
        !profile.data?.email ||
        !providerEmails.includes(profile.data.email.trim().toLowerCase())
      )
        throw new Error(
          'Stripe payer email does not match this student. Resolve ownership before importing.',
        )
      owner = options.importOwner
    }
  }
  if (!owner)
    throw new Error(
      'Payment has no verified student association. Import it after reviewing ownership or replay after the booking arrives.',
    )
  if (options.expectedOwner && owner !== options.expectedOwner)
    throw new Error('Payment belongs to another student.')
  if (bill) assertEnvironmentForSync(bill, ctx)
  const result = await stripeBillRPC(bill ? 'sync' : 'import', owner, billId ?? randomUUID(), {
    ...snapshot,
    account: ctx.account,
    observedAt,
    eventId: options.eventId ?? null,
    checkoutKey: pi.metadata.ada_checkout_key ?? null,
    actor: options.actor ?? 'stripe-webhook',
    description: (description || pi.description || 'Booking payment').slice(0, 200),
    calBookingId,
  })
  return { bill: result, ...evidence }
}
function assertEnvironmentForSync(bill: StoredBill, ctx: Context) {
  // An old, manually verified Stripe record can acquire its verified account and
  // mode once; afterwards they are immutable.
  if (bill.stripe_account_id) assertEnvironment(bill, ctx)
}

export async function startCheckout(owner: string, id: string) {
  const ctx = await stripeContext()
  if (!ctx.enabled) throw new Error('Online payments are not enabled.')
  let bill = await stripeBillRPC('reserve_checkout', owner, id, {
    account: ctx.account,
    livemode: ctx.livemode,
  })
  if (bill.stripe_checkout_session_id) {
    const current = await ctx.stripe.checkout.sessions.retrieve(bill.stripe_checkout_session_id)
    if (current.livemode !== ctx.livemode) throw new Error('Checkout environment mismatch.')
    if (current.status === 'open' && current.url) return current.url
    if (current.status !== 'expired')
      throw new Error('Payment is being verified. Do not pay again.')
    await stripeBillRPC('expire_checkout', owner, id, { session: current.id })
    bill = await stripeBillRPC('reserve_checkout', owner, id, {
      account: ctx.account,
      livemode: ctx.livemode,
    })
  }
  // Stripe may prune idempotency keys after 24 hours. Never recreate an unknown
  // session after that window; reconcile it explicitly first.
  if (
    !bill.stripe_checkout_started_at ||
    Date.now() - Date.parse(bill.stripe_checkout_started_at) > 23 * 3600000
  )
    throw new Error(
      'The previous checkout needs reconciliation in Stripe before another can be created.',
    )
  const items = await createSupabaseAdminClient()
    .from('app_payment_items')
    .select('description,quantity,unit_amount_cents')
    .eq('payment_id', id)
    .order('position')
  if (
    items.error ||
    !items.data?.length ||
    items.data.reduce((sum, i) => sum + i.quantity * i.unit_amount_cents, 0) !== bill.amount_cents
  )
    throw new Error('Bill item totals need review.')
  const origin = siteOrigin()
  const metadata = { ada_bill_id: id, ada_checkout_key: bill.stripe_checkout_key! }
  const session = await ctx.stripe.checkout.sessions.create(
    {
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: id,
      metadata,
      payment_intent_data: { metadata },
      line_items: items.data.map((i) => ({
        quantity: i.quantity,
        price_data: {
          currency: bill.currency,
          unit_amount: i.unit_amount_cents,
          product_data: { name: i.description },
        },
      })),
      success_url: `${origin}/account?message=Payment+submitted.+Your+bill+updates+after+verification.`,
      cancel_url: `${origin}/account?message=Checkout+closed.+Check+your+bill+before+trying+again.`,
    },
    { idempotencyKey: `ada-checkout-${bill.stripe_checkout_key}` },
  )
  if (!session.url || session.livemode !== ctx.livemode) throw new Error('Checkout is unavailable.')
  await stripeBillRPC('bind_checkout', owner, id, {
    key: bill.stripe_checkout_key,
    session: session.id,
  })
  return session.url
}

export async function requestFullRefund(owner: string, id: string, actor: string, reason: string) {
  const ctx = await stripeContext()
  if (!ctx.refundEnabled) throw new Error('Website refunds are not enabled.')
  let bill = await getBill(owner, id)
  assertEnvironment(bill, ctx)
  const piId = bill.stripe_payment_intent_id
  if (!piId) throw new Error('Reconcile the original Stripe payment first.')
  const before = await synchronizePayment(ctx, piId, { actor, expectedOwner: owner })
  if (before.snapshot.hasRefunds || before.bill.status !== 'paid')
    return { message: 'Existing refund status refreshed. No additional refund was requested.' }
  bill = await stripeBillRPC('start_refund', owner, id, {
    account: ctx.account,
    livemode: ctx.livemode,
    actor,
    reason,
  })
  if (!bill.refund_requested_at || Date.now() - Date.parse(bill.refund_requested_at) > 23 * 3600000)
    throw new Error(
      'The existing refund request needs manual reconciliation. No new refund was sent.',
    )
  // A persisted key and persisted reason make concurrent clicks and ambiguous
  // network retries the same Stripe request, even if the submitted form changes.
  await ctx.stripe.refunds.create(
    {
      payment_intent: piId,
      amount: bill.amount_cents,
      reason: 'requested_by_customer',
      metadata: {
        ada_bill_id: id,
        ada_refund_request: bill.refund_request_key!,
        reason: bill.refund_reason!,
      },
    },
    { idempotencyKey: `ada-refund-${bill.refund_request_key}` },
  )
  const result = await synchronizePayment(ctx, piId, { actor, expectedOwner: owner })
  return {
    message:
      result.bill.refund_state === 'succeeded'
        ? 'Full refund confirmed by Stripe.'
        : 'Refund request sent. Check the current status before taking further action.',
  }
}

export async function refreshBill(owner: string, id: string, actor: string) {
  const ctx = await stripeContext()
  const bill = await getBill(owner, id)
  assertEnvironmentForSync(bill, ctx)
  let piId = bill.stripe_payment_intent_id ?? bill.transaction_reference
  if (!piId?.startsWith('pi_') && bill.stripe_checkout_session_id) {
    const session = await ctx.stripe.checkout.sessions.retrieve(bill.stripe_checkout_session_id)
    piId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null)
  }
  if (!piId) throw new Error('No completed Stripe payment is available yet.')
  await synchronizePayment(ctx, piId, { actor, expectedOwner: owner })
}
