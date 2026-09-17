import Stripe from 'stripe'
import { stripeContext, stripeSettings } from '@/lib/stripe/config'
import { synchronizePayment } from '@/lib/stripe/billing'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
const accepted = new Set([
  'payment_intent.succeeded',
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'charge.refunded',
  'refund.created',
  'refund.updated',
  'refund.failed',
])
export async function POST(request: Request) {
  let settings: ReturnType<typeof stripeSettings>
  try {
    settings = stripeSettings()
  } catch {
    return Response.json({ error: 'Stripe is not configured.' }, { status: 503 })
  }
  if (Number(request.headers.get('content-length') ?? 0) > 1048576)
    return new Response(null, { status: 413 })
  const raw = await request.text()
  if (Buffer.byteLength(raw) > 1048576) return new Response(null, { status: 413 })
  let event: Stripe.Event
  try {
    event = Stripe.webhooks.constructEvent(
      raw,
      request.headers.get('stripe-signature') ?? '',
      settings.secret,
    )
  } catch {
    return Response.json({ error: 'Invalid signature.' }, { status: 400 })
  }
  if (event.livemode !== settings.livemode || (event.account && event.account !== settings.account))
    return Response.json({ error: 'Payment environment mismatch.' }, { status: 400 })
  if (!accepted.has(event.type)) return Response.json({ status: 'ignored' })
  const object = event.data.object as unknown as {
    id: string
    payment_intent?: string | { id: string } | null
  }
  const id =
    event.type === 'payment_intent.succeeded'
      ? object.id
      : typeof object.payment_intent === 'string'
        ? object.payment_intent
        : object.payment_intent?.id
  if (!id) return Response.json({ error: 'Payment reference missing.' }, { status: 422 })
  try {
    const ctx = await stripeContext()
    const result = await synchronizePayment(ctx, id, { eventId: event.id })
    revalidatePath('/account')
    revalidatePath(`/admin/students/${result.bill.user_profile_id}`)
    return Response.json({ status: 'synchronized' })
  } catch {
    // Keep unresolved events retryable and visible in Stripe Workbench. Do not
    // acknowledge an unassociated or unpersisted financial transaction as done.
    console.error('Stripe billing event needs reconciliation', {
      eventId: event.id,
      type: event.type,
    })
    return Response.json(
      { error: 'Payment requires reconciliation. Retry after checking its account association.' },
      { status: 409 },
    )
  }
}
