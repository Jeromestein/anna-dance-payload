import { beforeEach, describe, expect, it, vi } from 'vitest'
import { releasePackageCheckout } from '@/lib/billing/package-payment.server'
const m = vi.hoisted(() => ({
  read: vi.fn(),
  retrieve: vi.fn(),
  expire: vi.fn(),
  rpc: vi.fn(),
  refresh: vi.fn(),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => {
    const q = { select: () => q, eq: () => q, single: m.read }
    return { from: () => q }
  },
}))
vi.mock('@/lib/stripe/config', () => ({
  stripeContext: async () => ({
    account: 'acct_test',
    livemode: false,
    stripe: { checkout: { sessions: { retrieve: m.retrieve, expire: m.expire } } },
  }),
}))
vi.mock('@/lib/stripe/billing', () => ({ stripeBillRPC: m.rpc, refreshBill: m.refresh }))
beforeEach(() => {
  vi.clearAllMocks()
  m.read.mockResolvedValue({
    data: {
      package_id: 'level-1',
      status: 'payment_due',
      stripe_checkout_key: 'key',
      stripe_checkout_session_id: 'cs_test',
      stripe_payment_intent_id: null,
      stripe_account_id: 'acct_test',
      stripe_livemode: false,
    },
    error: null,
  })
  m.retrieve.mockResolvedValue({
    id: 'cs_test',
    status: 'open',
    livemode: false,
    client_reference_id: 'bill',
  })
  m.expire.mockResolvedValue({})
  m.rpc.mockResolvedValue({})
  m.refresh.mockResolvedValue({})
})
describe('Switching package payment method', () => {
  it('expires the provider session before releasing its reservation', async () => {
    await releasePackageCheckout('owner', 'bill')
    expect(m.expire).toHaveBeenCalledWith('cs_test')
    expect(m.rpc).toHaveBeenCalledWith('expire_checkout', 'owner', 'bill', { session: 'cs_test' })
    expect(m.expire.mock.invocationCallOrder[0]).toBeLessThan(m.rpc.mock.invocationCallOrder[0])
  })
  it('does not release a completed payment', async () => {
    m.retrieve.mockResolvedValue({
      id: 'cs_test',
      status: 'complete',
      livemode: false,
      client_reference_id: 'bill',
    })
    await expect(releasePackageCheckout('owner', 'bill')).rejects.toThrow('being verified')
    expect(m.refresh).toHaveBeenCalledWith('owner', 'bill', 'owner')
    expect(m.expire).not.toHaveBeenCalled()
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it('retains the reservation if provider expiration fails', async () => {
    m.expire.mockRejectedValue(new Error('network'))
    await expect(releasePackageCheckout('owner', 'bill')).rejects.toThrow()
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it('does not clear a reservation whose session is still being created', async () => {
    m.read.mockResolvedValue({
      data: { package_id: 'level-1', status: 'payment_due', stripe_checkout_key: 'key' },
    })
    await expect(releasePackageCheckout('owner', 'bill')).rejects.toThrow('still being prepared')
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it('rejects a different merchant environment before calling Stripe', async () => {
    m.read.mockResolvedValue({
      data: {
        package_id: 'level-1',
        status: 'payment_due',
        stripe_checkout_key: 'key',
        stripe_checkout_session_id: 'cs_test',
        stripe_account_id: 'acct_other',
        stripe_livemode: false,
      },
    })
    await expect(releasePackageCheckout('owner', 'bill')).rejects.toThrow(
      'another payment environment',
    )
    expect(m.retrieve).not.toHaveBeenCalled()
  })
})
