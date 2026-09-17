import type Stripe from 'stripe'

export type PaymentSnapshot = {
  paymentIntent: string
  amount: number
  currency: string
  livemode: boolean
  paidAt: string
  refundedAmount: number
  refundState: 'none' | 'pending' | 'succeeded' | 'failed' | 'requires_review'
  refundId: string | null
  refundRequestedAt: string | null
  refundConfirmedAt: string | null
  failure: string | null
  failedFullRefundId: string | null
  hasRefunds: boolean
}

export function paymentSnapshot(
  pi: Stripe.PaymentIntent,
  charge: Stripe.Charge,
  refunds: Stripe.Refund[],
): PaymentSnapshot {
  if (
    pi.status !== 'succeeded' ||
    !Number.isSafeInteger(pi.amount) ||
    pi.amount <= 0 ||
    pi.amount_received !== pi.amount ||
    charge.payment_intent !== pi.id ||
    !charge.paid ||
    !charge.captured ||
    charge.amount !== pi.amount ||
    charge.amount_captured !== pi.amount ||
    charge.currency !== pi.currency ||
    charge.livemode !== pi.livemode ||
    charge.disputed
  )
    throw new Error('The original full payment could not be verified.')
  if (
    refunds.some(
      (r) =>
        r.payment_intent !== pi.id ||
        r.charge !== charge.id ||
        r.currency !== pi.currency ||
        !Number.isSafeInteger(r.amount) ||
        r.amount <= 0,
    )
  )
    throw new Error('Refund evidence does not match the payment.')
  const succeeded = refunds.filter((r) => r.status === 'succeeded')
  const refundedAmount = succeeded.reduce((total, r) => total + r.amount, 0)
  if (refundedAmount > pi.amount) throw new Error('Refund amount exceeds the payment.')
  const pending = refunds.find((r) => ['pending', 'requires_action'].includes(r.status ?? ''))
  const latest = [...refunds].sort((a, b) => b.created - a.created || b.id.localeCompare(a.id))[0]
  const state =
    refundedAmount === pi.amount
      ? 'succeeded'
      : pending
        ? 'pending'
        : refundedAmount > 0
          ? 'requires_review'
          : latest && ['failed', 'canceled'].includes(latest.status ?? '')
            ? 'failed'
            : refunds.length
              ? 'requires_review'
              : 'none'
  return {
    paymentIntent: pi.id,
    amount: pi.amount,
    currency: pi.currency,
    livemode: pi.livemode,
    paidAt: new Date(charge.created * 1000).toISOString(),
    refundedAmount,
    refundState: state,
    refundId: (pending ?? latest)?.id ?? null,
    refundRequestedAt: latest ? new Date(latest.created * 1000).toISOString() : null,
    // Stripe's `created` is request time, not completion time. Store the time that
    // completion was actually observed separately in the database.
    refundConfirmedAt: state === 'succeeded' ? new Date().toISOString() : null,
    failure: state === 'failed' ? (latest?.failure_reason ?? 'refund_failed') : null,
    failedFullRefundId:
      refunds.find((r) => r.amount === pi.amount && ['failed', 'canceled'].includes(r.status ?? ''))
        ?.id ?? null,
    hasRefunds: refunds.length > 0,
  }
}
