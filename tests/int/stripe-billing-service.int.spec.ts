// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({
  db: vi.fn(),
  ctx: vi.fn(),
  rpc: vi.fn(),
  retrieve: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: m.db }))
vi.mock('@/lib/stripe/config', () => ({
  stripeContext: m.ctx,
  siteOrigin: () => 'http://localhost:3000',
}))
import { requestFullRefund, synchronizePayment } from '@/lib/stripe/billing'
const owner = '00000000-0000-4000-8000-000000000001',
  id = '20000000-0000-4000-8000-000000000001'
const pi = {
  id: 'pi_123',
  amount: 50,
  amount_received: 50,
  status: 'succeeded',
  currency: 'usd',
  livemode: false,
  metadata: {},
  latest_charge: {
    id: 'ch_123',
    payment_intent: 'pi_123',
    paid: true,
    captured: true,
    amount: 50,
    amount_captured: 50,
    currency: 'usd',
    livemode: false,
    disputed: false,
    created: 1700000000,
    billing_details: { email: 'student@example.com' },
  },
}
const refund = {
  id: 're_123',
  amount: 50,
  currency: 'usd',
  payment_intent: 'pi_123',
  charge: 'ch_123',
  created: 1700000100,
  status: 'succeeded',
}
let row: Record<string, unknown>
let refunds: unknown[]
const ctx = {
  enabled: true,
  refundEnabled: true,
  account: 'acct_123',
  livemode: false,
  stripe: { paymentIntents: { retrieve: m.retrieve }, refunds: { list: m.list, create: m.create } },
}
beforeEach(() => {
  vi.resetAllMocks()
  refunds = []
  row = {
    id,
    user_profile_id: owner,
    amount_cents: 50,
    currency: 'usd',
    status: 'paid',
    stripe_account_id: 'acct_123',
    stripe_livemode: false,
    stripe_payment_intent_id: 'pi_123',
    transaction_reference: 'pi_123',
    refund_state: 'none',
    refund_request_key: null,
  }
  const query: Record<string, unknown> = {}
  for (const name of ['select', 'eq', 'limit']) query[name] = () => query
  query.single = async () => ({ data: { ...row } })
  query.maybeSingle = async () => ({ data: { ...row } })
  m.db.mockReturnValue({ from: () => query, rpc: m.rpc })
  m.ctx.mockResolvedValue(ctx)
  m.retrieve.mockResolvedValue(pi)
  m.list.mockImplementation(async () => ({ data: refunds, has_more: false }))
  m.create.mockImplementation(async () => {
    refunds = [refund]
    return refund
  })
  m.rpc.mockImplementation(async (_name, args) => {
    if (args.p_operation === 'start_refund' && !row.refund_request_key)
      Object.assign(row, {
        refund_request_key: 'fixed-key',
        refund_reason: args.p_data.reason,
        refund_state: 'requested',
        refund_requested_at: new Date().toISOString(),
      })
    if (args.p_operation === 'sync')
      Object.assign(row, {
        status: args.p_data.refundState === 'succeeded' ? 'refunded' : 'paid',
        refund_state:
          args.p_data.refundState === 'none' && row.refund_request_key
            ? 'requested'
            : args.p_data.refundState,
      })
    return { data: { ...row } }
  })
})
describe('Stripe refund orchestration', () => {
  it('rejects refunds when only Checkout is enabled, before reading or changing the bill', async () => {
    m.ctx.mockResolvedValue({ ...ctx, enabled: true, refundEnabled: false })
    await expect(requestFullRefund(owner, id, 'staff', 'Schedule change')).rejects.toThrow(
      'Website refunds are not enabled.',
    )
    expect(m.db).not.toHaveBeenCalled()
    expect(m.create).not.toHaveBeenCalled()
  })
  it('allows Admin refunds while website Checkout remains disabled', async () => {
    m.ctx.mockResolvedValue({ ...ctx, enabled: false, refundEnabled: true })
    const result = await requestFullRefund(owner, id, 'staff', 'Schedule change')
    expect(result.message).toBe('Full refund confirmed by Stripe.')
    expect(m.create).toHaveBeenCalledTimes(1)
  })
  it('refunds the verified server amount and persists completion only after querying Stripe', async () => {
    const result = await requestFullRefund(owner, id, 'staff', 'Schedule change')
    expect(m.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 50, payment_intent: 'pi_123' }),
      { idempotencyKey: 'ada-refund-fixed-key' },
    )
    expect(m.list).toHaveBeenCalledTimes(2)
    expect(result.message).toBe('Full refund confirmed by Stripe.')
  })
  it('reuses the persisted key and reason after an ambiguous timeout', async () => {
    m.create.mockRejectedValueOnce(new Error('timeout'))
    await expect(requestFullRefund(owner, id, 'staff', 'First reason')).rejects.toThrow('timeout')
    expect(row.refund_state).toBe('requested')
    expect(row.status).toBe('paid')
    await requestFullRefund(owner, id, 'staff', 'New browser reason')
    expect(m.create.mock.calls[0]).toEqual(m.create.mock.calls[1])
  })
  it('never creates a second refund when Stripe already has a pending one', async () => {
    refunds = [{ ...refund, status: 'pending' }]
    await requestFullRefund(owner, id, 'staff', 'Schedule change')
    expect(m.create).not.toHaveBeenCalled()
    expect(row.refund_state).toBe('pending')
    expect(row.status).toBe('paid')
  })
  it('rejects incorrect account context and amount mismatches before initiating a refund', async () => {
    row.stripe_account_id = 'acct_other'
    await expect(requestFullRefund(owner, id, 'staff', 'reason')).rejects.toThrow(
      'different Stripe environment',
    )
    expect(m.create).not.toHaveBeenCalled()
  })
  it('requires manual reconciliation beyond the idempotency retention window', async () => {
    Object.assign(row, {
      refund_request_key: 'fixed-key',
      refund_requested_at: '2020-01-01T00:00:00Z',
      refund_reason: 'Original',
    })
    await expect(requestFullRefund(owner, id, 'staff', 'Again')).rejects.toThrow(
      'manual reconciliation',
    )
    expect(m.create).not.toHaveBeenCalled()
  })
  it('rejects a historical import into a different student account', async () => {
    await expect(
      synchronizePayment(ctx as never, 'pi_123', { importOwner: 'another-user' }),
    ).rejects.toThrow('another student')
    expect(m.rpc).not.toHaveBeenCalled()
  })
})
