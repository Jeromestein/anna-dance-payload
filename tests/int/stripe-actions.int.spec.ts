import { beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  refund: vi.fn(),
  refresh: vi.fn(),
  sync: vi.fn(),
  rpc: vi.fn(),
  claims: vi.fn(),
  checkout: vi.fn(),
  ctx: vi.fn(),
  issue: vi.fn(),
  redirect: vi.fn(),
}))
vi.mock('next/navigation', () => ({ redirect: m.redirect }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: m.issue }) }))
vi.mock('@/lib/staff/auth', () => ({ requirePayloadAdministrator: m.auth }))
vi.mock('@/lib/stripe/billing', () => ({
  requestFullRefund: m.refund,
  refreshBill: m.refresh,
  synchronizePayment: m.sync,
  stripeBillRPC: m.rpc,
  startCheckout: m.checkout,
  uuidPattern: /^[0-9a-f-]{36}$/,
}))
vi.mock('@/lib/stripe/config', () => ({ stripeContext: m.ctx }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getClaims: m.claims } }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import {
  refundStripeBill,
  checkoutStripeBill,
  createStripeTestBill,
} from '@/actions/stripe-billing'
const owner = '00000000-0000-4000-8000-000000000001'
const id = '20000000-0000-4000-8000-000000000001'
function form() {
  const f = new FormData()
  Object.entries({
    owner,
    id,
    reason: 'Schedule changed',
    confirmed: 'yes',
    termsAccepted: 'yes',
    amount: '1',
    actor: 'forged',
  }).forEach(([k, v]) => f.set(k, v))
  return f
}
beforeEach(() => {
  vi.resetAllMocks()
  m.auth.mockResolvedValue({ id: 7 })
  m.refund.mockResolvedValue({ message: 'Verified refund' })
  m.ctx.mockResolvedValue({ livemode: false, account: 'acct_test' })
  m.issue.mockResolvedValue({ data: id })
  m.rpc.mockResolvedValue({})
  m.claims.mockResolvedValue({ data: { claims: { sub: owner } } })
  m.checkout.mockResolvedValue('https://checkout.stripe.com/test')
  m.redirect.mockImplementation(() => {
    throw new Error('NEXT_REDIRECT')
  })
})
describe('Stripe action boundaries', () => {
  it('requires administrator auth before refunding', async () => {
    m.auth.mockRejectedValue(new Error('denied'))
    await expect(refundStripeBill({}, form())).rejects.toThrow('denied')
    expect(m.refund).not.toHaveBeenCalled()
  })
  it('ignores forged actor and amount, requires confirmation and reason', async () => {
    await refundStripeBill({}, form())
    expect(m.refund).toHaveBeenCalledWith(owner, id, '7', 'Schedule changed')
    m.refund.mockClear()
    const f = form()
    f.delete('confirmed')
    expect((await refundStripeBill({}, f)).error).toBeDefined()
    expect(m.refund).not.toHaveBeenCalled()
  })
  it('derives checkout owner from the student session', async () => {
    const f = form()
    f.set('owner', 'forged')
    await expect(checkoutStripeBill({}, f)).rejects.toThrow('NEXT_REDIRECT')
    expect(m.checkout).toHaveBeenCalledWith(owner, id)
    expect(m.redirect).toHaveBeenCalledWith('https://checkout.stripe.com/test')
  })
  it('does not charge when no student session exists', async () => {
    m.claims.mockResolvedValue({ error: 'no session' })
    expect((await checkoutStripeBill({}, form())).error).toBeDefined()
    expect(m.checkout).not.toHaveBeenCalled()
  })
  it('requires bill acknowledgement and saves it for the authenticated owner only', async () => {
    const f = form()
    f.delete('termsAccepted')
    expect((await checkoutStripeBill({}, f)).error).toBeDefined()
    expect(m.checkout).not.toHaveBeenCalled()
    expect(m.issue).not.toHaveBeenCalled()
    f.set('termsAccepted', 'yes')
    f.set('note', 'Please confirm the Saturday dates.')
    f.set('owner', 'forged')
    await expect(checkoutStripeBill({}, f)).rejects.toThrow('NEXT_REDIRECT')
    expect(m.issue).toHaveBeenCalledWith('app_accept_bill', {
      p_owner: owner,
      p_id: id,
      p_terms: 'website-terms-2026-09-10',
      p_note: 'Please confirm the Saturday dates.',
    })
    m.issue.mockResolvedValue({ error: { message: 'wrong owner' } })
    m.checkout.mockClear()
    expect((await checkoutStripeBill({}, f)).error).toBeDefined()
    expect(m.checkout).not.toHaveBeenCalled()
  })
  it('never creates test bills using live credentials', async () => {
    m.ctx.mockResolvedValue({ livemode: true })
    expect((await createStripeTestBill({}, form())).error).toBeDefined()
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it('creates the requested sandbox amount and rejects invalid amounts before writing', async () => {
    const f = form()
    f.set('price', '300.00')
    expect((await createStripeTestBill({}, f)).success).toBeDefined()
    expect(m.issue).toHaveBeenCalledWith(
      'app_issue_bill',
      expect.objectContaining({
        p_test_account: 'acct_test',
        p_items: [
          {
            description: 'Stripe test payment — no real charge',
            quantity: 1,
            unit_amount_cents: 30000,
          },
        ],
      }),
    )
    for (const price of ['0.49', '1.999', '-5', '100000.01']) {
      m.issue.mockClear()
      f.set('price', price)
      expect((await createStripeTestBill({}, f)).error).toBeDefined()
      expect(m.issue).not.toHaveBeenCalled()
    }
  })
  it('blocks forged staff checkout in live mode', async () => {
    m.ctx.mockResolvedValue({ livemode: true })
    const f = form()
    f.set('staffTest', 'yes')
    expect((await checkoutStripeBill({}, f)).error).toBeDefined()
    expect(m.checkout).not.toHaveBeenCalled()
  })
  it('redirects sandbox staff checkout and keeps provider errors on the bill', async () => {
    const f = form()
    f.set('staffTest', 'yes')
    await expect(checkoutStripeBill({}, f)).rejects.toThrow('NEXT_REDIRECT')
    expect(m.redirect).toHaveBeenCalledWith('https://checkout.stripe.com/test')
    m.redirect.mockClear()
    m.checkout.mockRejectedValue(new Error('Checkout is unavailable.'))
    expect(await checkoutStripeBill({}, f)).toEqual({ error: 'Checkout is unavailable.' })
    expect(m.redirect).not.toHaveBeenCalled()
  })
})
