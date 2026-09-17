import { describe, it, expect } from 'vitest'
import type Stripe from 'stripe'
import { paymentSnapshot } from '@/lib/stripe/snapshot'
import { billingSummary } from '@/lib/billing/model'
const pi = {
  id: 'pi_123',
  status: 'succeeded',
  amount: 50,
  amount_received: 50,
  currency: 'usd',
  livemode: false,
} as Stripe.PaymentIntent
const charge = {
  id: 'ch_123',
  payment_intent: pi.id,
  paid: true,
  captured: true,
  amount: 50,
  amount_captured: 50,
  currency: 'usd',
  livemode: false,
  created: 1700000000,
  disputed: false,
} as Stripe.Charge
const refund = {
  id: 're_123',
  payment_intent: pi.id,
  charge: charge.id,
  amount: 50,
  currency: 'usd',
  status: 'succeeded',
  created: 1700000100,
} as Stripe.Refund

describe('verified Stripe payment snapshots', () => {
  it('uses original payment time and confirmed full refund evidence', () => {
    const s = paymentSnapshot(pi, charge, [refund])
    expect(s.refundState).toBe('succeeded')
    expect(s.refundedAmount).toBe(50)
    expect(s.paidAt).toBe(new Date(charge.created * 1000).toISOString())
    expect(s.refundRequestedAt).not.toBe(s.refundConfirmedAt)
  })
  it('never marks pending or failed refunds complete', () => {
    for (const status of ['pending', 'requires_action', 'failed', 'canceled'] as const) {
      const s = paymentSnapshot(pi, charge, [{ ...refund, status }])
      expect(s.refundedAmount).toBe(0)
      expect(s.refundState).not.toBe('succeeded')
      expect(s.refundConfirmedAt).toBeNull()
    }
  })
  it('identifies a full refund that failed after initially succeeding', () => {
    expect(paymentSnapshot(pi, charge, [refund]).failedFullRefundId).toBeNull()
    const failed = paymentSnapshot(pi, charge, [{ ...refund, status: 'failed' }])
    expect(failed.failedFullRefundId).toBe(refund.id)
    expect(failed.refundedAmount).toBe(0)
    expect(failed.refundState).toBe('failed')
    expect(
      paymentSnapshot(pi, charge, [{ ...refund, status: 'failed', amount: 20 }]).failedFullRefundId,
    ).toBeNull()
  })
  it('flags historical partial refunds for review', () => {
    const s = paymentSnapshot(pi, charge, [{ ...refund, amount: 20 }])
    expect(s.refundState).toBe('requires_review')
    expect(s.refundedAmount).toBe(20)
  })
  it('rejects mismatched or incomplete payment evidence', () => {
    expect(() => paymentSnapshot({ ...pi, amount_received: 20 }, charge, [])).toThrow()
    expect(() => paymentSnapshot(pi, { ...charge, livemode: true }, [])).toThrow()
    expect(() => paymentSnapshot(pi, { ...charge, disputed: true }, [])).toThrow()
    expect(() => paymentSnapshot(pi, charge, [{ ...refund, payment_intent: 'pi_other' }])).toThrow()
    expect(() => paymentSnapshot(pi, charge, [refund, { ...refund, id: 're_456' }])).toThrow()
  })
  it('keeps test bills out of the real balance', () => {
    expect(
      billingSummary([
        {
          stripe_livemode: false,
          status: 'payment_due',
          amount_cents: 50,
          currency: 'usd',
        } as never,
      ]),
    ).toBe('Test payments only')
  })
})
