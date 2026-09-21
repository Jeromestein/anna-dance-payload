// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Stripe from 'stripe'
const mocks = vi.hoisted(() => ({
  sync: vi.fn(),
  ctx: vi.fn(),
  settings: vi.fn(),
  notices: vi.fn(),
}))
vi.mock('@/lib/email/billing-notifications.server', () => ({ billingNotices: mocks.notices }))
vi.mock('@/lib/stripe/config', () => ({ stripeContext: mocks.ctx, stripeSettings: mocks.settings }))
vi.mock('@/lib/stripe/billing', () => ({ synchronizePayment: mocks.sync }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { POST } from '@/app/(frontend)/api/integrations/stripe/webhook/route'
const secret = 'whsec_testsecret'
function request(patch = {}, signature?: string) {
  const payload = JSON.stringify({
    id: 'evt_123',
    type: 'payment_intent.succeeded',
    livemode: false,
    data: { object: { id: 'pi_123' } },
    ...patch,
  })
  return new Request('http://localhost/api/integrations/stripe/webhook', {
    method: 'POST',
    body: payload,
    headers: {
      'stripe-signature':
        signature ?? Stripe.webhooks.generateTestHeaderString({ payload, secret }),
    },
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.settings.mockReturnValue({ secret, livemode: false, account: 'acct_123' })
  mocks.ctx.mockResolvedValue({})
  mocks.sync.mockResolvedValue({ bill: { user_profile_id: 'owner' } })
  mocks.notices.mockResolvedValue({ sent: 2 })
})
describe('Stripe webhook verification', () => {
  it('verifies a signed raw payload before synchronization', async () => {
    expect((await POST(request())).status).toBe(200)
    expect(mocks.sync).toHaveBeenCalledWith({}, 'pi_123', { eventId: 'evt_123' })
  })
  it('rejects invalid and old signatures without touching the provider or database', async () => {
    expect((await POST(request({}, 'bad'))).status).toBe(400)
    expect(mocks.ctx).not.toHaveBeenCalled()
  })
  it('keeps a saved payment and requests a webhook retry when email fails', async () => {
    mocks.notices.mockRejectedValue(new Error('provider unavailable'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await POST(request())).status).toBe(503)
    expect(mocks.sync).toHaveBeenCalledTimes(1)
    mocks.notices.mockResolvedValue({ sent: 2 })
    expect((await POST(request())).status).toBe(200)
    log.mockRestore()
  })
  it('rejects wrong live mode and connected account', async () => {
    expect((await POST(request({ livemode: true }))).status).toBe(400)
    expect((await POST(request({ account: 'acct_other' }))).status).toBe(400)
    expect(mocks.sync).not.toHaveBeenCalled()
  })
  it('does not acknowledge a failed or unassociated database update', async () => {
    mocks.sync.mockRejectedValue(new Error('not linked'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await POST(request())).status).toBe(409)
    log.mockRestore()
  })
  it('reconciles refund events through the original payment and ignores unrelated events', async () => {
    expect(
      (
        await POST(
          request({
            type: 'refund.updated',
            data: { object: { id: 're_123', payment_intent: 'pi_123' } },
          }),
        )
      ).status,
    ).toBe(200)
    expect(mocks.sync).toHaveBeenCalledWith({}, 'pi_123', { eventId: 'evt_123' })
    mocks.sync.mockClear()
    await POST(request({ type: 'customer.created' }))
    expect(mocks.sync).not.toHaveBeenCalled()
  })
})
