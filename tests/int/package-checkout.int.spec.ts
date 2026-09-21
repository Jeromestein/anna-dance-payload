// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ db: vi.fn(), ctx: vi.fn(), rpc: vi.fn(), retrieve: vi.fn(), create: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: m.db }))
vi.mock('@/lib/stripe/config', () => ({ stripeContext: m.ctx, siteOrigin: () => 'http://localhost:3005' }))
import { checkoutReadiness, startCheckout } from '@/lib/stripe/billing'
const owner = '00000000-0000-4000-8000-000000000001'
const id = '20000000-0000-4000-8000-000000000001'
let bill: Record<string, unknown>
let items: Array<{ description: string; quantity: number; unit_amount_cents: number }>
beforeEach(() => {
  vi.resetAllMocks()
  bill = { id, user_profile_id: owner, status: 'payment_due', amount_cents: 30000, currency: 'usd', stripe_account_id: 'acct_test', stripe_livemode: false, stripe_checkout_key: 'fixed-key', stripe_checkout_started_at: new Date().toISOString(), stripe_checkout_session_id: null }
  items = [{ description: 'Ballet (10 lessons)', quantity: 10, unit_amount_cents: 3000 }]
  const query = { select: () => query, eq: () => query, single: async () => ({ data: bill }), order: async () => ({ data: items }) }
  m.db.mockReturnValue({ from: () => query, rpc: m.rpc })
  m.rpc.mockImplementation(async (_name, args) => {
    if (args.p_owner !== owner || bill.status !== 'payment_due') return { error: 'Not payable' }
    if (args.p_operation === 'expire_checkout') bill.stripe_checkout_session_id = null
    return { data: { ...bill } }
  })
  m.ctx.mockResolvedValue({ account: 'acct_test', livemode: false, enabled: true, stripe: { checkout: { sessions: { retrieve: m.retrieve, create: m.create } } } })
  m.create.mockResolvedValue({ id: 'cs_test_new', livemode: false, url: 'https://checkout.stripe.com/new' })
})
describe('package checkout safety', () => {
  it('uses immutable stored quantities, prices, association and per-bill return paths', async () => {
    await startCheckout(owner, id)
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [{ quantity: 10, price_data: { currency: 'usd', unit_amount: 3000, product_data: { name: 'Ballet (10 lessons)' } } }],
      payment_intent_data: { metadata: { ada_bill_id: id, ada_checkout_key: 'fixed-key' } },
      success_url: `http://localhost:3005/account/billing/${id}?checkout=submitted`,
      cancel_url: `http://localhost:3005/account/billing/${id}?checkout=closed`,
    }), { idempotencyKey: 'ada-checkout-fixed-key' })
  })
  it('reuses an open session without creating another', async () => {
    bill.stripe_checkout_session_id = 'cs_test_old'
    m.retrieve.mockResolvedValue({ status: 'open', livemode: false, url: 'https://checkout.stripe.com/existing' })
    expect(await startCheckout(owner, id)).toBe('https://checkout.stripe.com/existing')
    expect(m.create).not.toHaveBeenCalled()
  })
  it('replaces only a verified expired session', async () => {
    bill.stripe_checkout_session_id = 'cs_test_old'
    m.retrieve.mockResolvedValue({ id: 'cs_test_old', status: 'expired', livemode: false })
    await startCheckout(owner, id)
    expect(m.rpc.mock.calls.map((c) => c[1].p_operation)).toEqual(['reserve_checkout', 'expire_checkout', 'reserve_checkout', 'bind_checkout'])
    expect(m.create).toHaveBeenCalledTimes(1)
  })
  it('shows pending and blocks repeat payment when Stripe completed before the webhook', async () => {
    bill.stripe_checkout_session_id = 'cs_test_old'
    m.retrieve.mockResolvedValue({ status: 'complete', livemode: false })
    expect(await checkoutReadiness(owner, id)).toBe('pending')
    await expect(startCheckout(owner, id)).rejects.toThrow('Do not pay again')
    expect(m.create).not.toHaveBeenCalled()
  })
  it('retries an ambiguous creation with the same idempotency key', async () => {
    m.create.mockRejectedValueOnce(new Error('timeout'))
    await expect(startCheckout(owner, id)).rejects.toThrow('timeout')
    await startCheckout(owner, id)
    expect(m.create.mock.calls[0]).toEqual(m.create.mock.calls[1])
  })
  it('blocks an old unknown session and mismatched item totals', async () => {
    bill.stripe_checkout_started_at = '2020-01-01T00:00:00Z'
    expect(await checkoutReadiness(owner, id)).toBe('unavailable')
    await expect(startCheckout(owner, id)).rejects.toThrow('reconciliation')
    bill.stripe_checkout_started_at = new Date().toISOString()
    items[0].quantity = 9
    await expect(startCheckout(owner, id)).rejects.toThrow('totals')
    expect(m.create).not.toHaveBeenCalled()
  })
  it.each(['paid', 'refunded', 'cancelled', 'pending_verification'])('respects database refusal for %s', async (status) => {
    bill.status = status
    await expect(startCheckout(owner, id)).rejects.toThrow()
    expect(m.create).not.toHaveBeenCalled()
  })
  it('blocks wrong owners and fail-closed environment mismatches', async () => {
    await expect(startCheckout('another-owner', id)).rejects.toThrow()
    bill.stripe_checkout_session_id = 'cs_test_old'
    m.retrieve.mockResolvedValue({ status: 'open', livemode: true, url: 'https://checkout.stripe.com/live' })
    expect(await checkoutReadiness(owner, id)).toBe('unavailable')
    await expect(startCheckout(owner, id)).rejects.toThrow('environment mismatch')
    expect(m.create).not.toHaveBeenCalled()
  })
})
