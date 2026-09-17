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
}))
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
    amount: '1',
    actor: 'forged',
  }).forEach(([k, v]) => f.set(k, v))
  return f
}
beforeEach(() => {
  vi.resetAllMocks()
  m.auth.mockResolvedValue({ id: 7 })
  m.refund.mockResolvedValue({ message: 'Verified refund' })
  m.ctx.mockResolvedValue({ livemode: false })
  m.rpc.mockResolvedValue({})
  m.claims.mockResolvedValue({ data: { claims: { sub: owner } } })
  m.checkout.mockResolvedValue('https://checkout.stripe.com/test')
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
    await checkoutStripeBill({}, f)
    expect(m.checkout).toHaveBeenCalledWith(owner, id)
  })
  it('does not charge when no student session exists', async () => {
    m.claims.mockResolvedValue({ error: 'no session' })
    expect((await checkoutStripeBill({}, form())).error).toBeDefined()
    expect(m.checkout).not.toHaveBeenCalled()
  })
  it('never creates test bills using live credentials', async () => {
    m.ctx.mockResolvedValue({ livemode: true })
    expect((await createStripeTestBill({}, form())).error).toBeDefined()
    expect(m.rpc).not.toHaveBeenCalled()
  })
})
