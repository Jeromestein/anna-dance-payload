import { beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ auth: vi.fn(), load: vi.fn(), notices: vi.fn() }))
vi.mock('@/lib/staff/auth', () => ({ requirePayloadAdministrator: m.auth }))
vi.mock('@/lib/billing/load', () => ({ loadBill: m.load }))
vi.mock('@/lib/email/billing-notifications.server', () => ({ billingNotices: m.notices }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({}) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
import { sendBillingEmail } from '@/actions/billing-notifications'
const owner = '00000000-0000-4000-8000-000000000001'
const id = '20000000-0000-4000-8000-000000000001'
function form() {
  const f = new FormData()
  f.set('owner', owner)
  f.set('id', id)
  f.set('email', 'forged@example.com')
  return f
}
beforeEach(() => {
  vi.resetAllMocks()
  m.auth.mockResolvedValue({ id: 7 })
  m.load.mockResolvedValue({ bill: { status: 'payment_due', checkout_available: true } })
  m.notices.mockResolvedValue({ sent: 1 })
})
describe('admin billing email authorization', () => {
  it('requires staff authorization before querying or sending', async () => {
    m.auth.mockRejectedValue(new Error('forbidden'))
    await expect(sendBillingEmail({}, form())).rejects.toThrow('forbidden')
    expect(m.load).not.toHaveBeenCalled()
    expect(m.notices).not.toHaveBeenCalled()
  })
  it('uses only the stored bill and ignores a forged recipient', async () => {
    expect((await sendBillingEmail({}, form())).success).toBeDefined()
    expect(m.load).toHaveBeenCalledWith({}, owner, id)
    expect(m.notices).toHaveBeenCalledWith(owner, id, true)
  })
  it('does not advertise an unavailable payment flow', async () => {
    m.load.mockResolvedValue({ bill: { status: 'payment_due', checkout_available: false } })
    expect((await sendBillingEmail({}, form())).error).toBeDefined()
    expect(m.notices).not.toHaveBeenCalled()
  })
  it('retries confirmations rather than sending another payment request on a paid bill', async () => {
    m.load.mockResolvedValue({ bill: { status: 'paid' } })
    await sendBillingEmail({}, form())
    expect(m.notices).toHaveBeenCalledWith(owner, id, false)
  })
})
