import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { issuePackage } from '@/lib/billing/package-sales.server'
import {
  purchasePackage,
  changePackagePaymentMethod,
  cancelPackagePurchase,
} from '@/actions/course-package'
import { releasePackageCheckout } from '@/lib/billing/package-payment.server'
import { manageBill } from '@/actions/billing'
vi.mock('@/lib/billing/package-payment.server', () => ({
  releasePackageCheckout: vi.fn().mockResolvedValue(undefined),
}))
const m = vi.hoisted(() => ({ rpc: vi.fn(), claims: vi.fn(), staff: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: m.rpc }) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getClaims: m.claims } }),
}))
vi.mock('@/lib/staff/auth', () => ({ requirePayloadAdministrator: m.staff }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`)
  },
}))
const owner = '00000000-0000-4000-8000-000000000001'
const bill = '80000000-0000-4000-8000-000000000001'
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(releasePackageCheckout).mockResolvedValue(undefined)
  vi.stubEnv('STRIPE_MODE', 'test')
  m.claims.mockResolvedValue({ data: { claims: { sub: owner } }, error: null })
  m.staff.mockResolvedValue({ id: 'admin' })
  m.rpc.mockResolvedValue({ data: bill, error: null })
})
afterEach(() => vi.unstubAllEnvs())
function form(data: Record<string, string>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(data)) f.set(k, v)
  return f
}
describe('Package authorization and server prices', () => {
  it('ignores browser owner, lesson count and discount inputs', async () => {
    await expect(
      purchasePackage(
        {},
        form({
          package_id: 'SOLO-01',
          method: 'online',
          confirmed: 'yes',
          owner: bill,
          total_price: '1',
          credit_count: '99',
        }),
      ),
    ).rejects.toThrow(`REDIRECT:/account/billing/${bill}`)
    expect(m.rpc).toHaveBeenCalledWith(
      'app_purchase_package',
      expect.objectContaining({
        p_owner: owner,
        p_total: 36000,
        p_live: false,
        p_admin: false,
        p_item: expect.objectContaining({ credit_count: 9, lesson_duration_minutes: 30 }),
      }),
    )
  })
  it('rejects anonymous purchase before any database write', async () => {
    m.claims.mockResolvedValue({ data: null, error: null })
    expect(
      await purchasePackage({}, form({ package_id: 'level-1', method: 'cash', confirmed: 'yes' })),
    ).toHaveProperty('error')
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it('rejects unknown IDs and invalid payment choices', async () => {
    await expect(
      issuePackage({ owner, id: bill, actor: owner, packageId: 'GROUP-01' }),
    ).rejects.toThrow('Choose')
    expect(
      await purchasePackage({}, form({ package_id: 'level-1', method: 'free', confirmed: 'yes' })),
    ).toHaveProperty('error')
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it('uses authenticated owner when changing cash preference and reports a payment race', async () => {
    m.rpc.mockResolvedValue({ data: null, error: {} })
    expect(
      await changePackagePaymentMethod({}, form({ id: bill, owner: bill, method: 'cash' })),
    ).toHaveProperty('error')
    expect(m.rpc).toHaveBeenCalledWith('app_package_payment_method', {
      p_owner: owner,
      p_id: bill,
      p_cash: true,
    })
  })
  it('allows an authorized Admin amount with config-owned credits and a reused bill ID', async () => {
    const requestId = '80000000-0000-4000-8000-000000000002'
    const result = await manageBill(
      {},
      form({
        owner,
        id: requestId,
        operation: 'issue',
        confirmed: 'yes',
        bill_kind: 'package',
        package_id: 'level-1',
        total_price: '280',
        credit_count: '1',
      }),
    )
    expect(m.staff).toHaveBeenCalledOnce()
    expect(result).toMatchObject({ billId: bill, requestId })
    expect(m.rpc).toHaveBeenCalledWith(
      'app_purchase_package',
      expect.objectContaining({
        p_admin: true,
        p_actor: 'admin',
        p_total: 28000,
        p_item: expect.objectContaining({ credit_count: 10 }),
      }),
    )
  })
  it('never creates a real package for a misconfigured sandbox', async () => {
    vi.stubEnv('STRIPE_SECRET_KEY', '')
    await issuePackage({ owner, id: bill, actor: owner, packageId: 'level-1', cash: true })
    expect(m.rpc).toHaveBeenCalledWith(
      'app_purchase_package',
      expect.objectContaining({ p_live: false, p_cash: true }),
    )
  })
})

describe('Student order cancellation', () => {
  it('uses the authenticated owner and closes checkout before cancellation', async () => {
    expect(
      await cancelPackagePurchase({}, form({ id: bill, owner: bill, confirmed: 'yes' })),
    ).toEqual({})
    expect(releasePackageCheckout).toHaveBeenCalledWith(owner, bill)
    expect(m.rpc).toHaveBeenCalledWith('app_cancel_package', {
      p_owner: owner,
      p_id: bill,
      p_actor: owner,
    })
    expect(vi.mocked(releasePackageCheckout).mock.invocationCallOrder[0]).toBeLessThan(
      m.rpc.mock.invocationCallOrder[0],
    )
  })
  it('rejects anonymous requests and missing confirmation before touching checkout', async () => {
    expect(await cancelPackagePurchase({}, form({ id: bill }))).toHaveProperty('error')
    m.claims.mockResolvedValue({ data: null, error: null })
    expect(await cancelPackagePurchase({}, form({ id: bill, confirmed: 'yes' }))).toHaveProperty(
      'error',
    )
    expect(releasePackageCheckout).not.toHaveBeenCalled()
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it('does not cancel when payment is complete, cannot be verified, or belongs to another student', async () => {
    vi.mocked(releasePackageCheckout).mockRejectedValue(new Error('Payment cannot be released'))
    expect(await cancelPackagePurchase({}, form({ id: bill, confirmed: 'yes' }))).toHaveProperty(
      'error',
    )
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it('reports a concurrent checkout or payment blocking database cancellation', async () => {
    m.rpc.mockResolvedValue({ data: null, error: { message: 'Resolve payment' } })
    expect(await cancelPackagePurchase({}, form({ id: bill, confirmed: 'yes' }))).toHaveProperty(
      'error',
    )
  })
})
