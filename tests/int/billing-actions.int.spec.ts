import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }))
vi.mock('@/lib/staff/auth', () => ({ requirePayloadAdministrator: mocks.auth }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: mocks.rpc }) }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
import { manageBill } from '@/actions/billing'
function form() {
  const data = new FormData()
  for (const [key, value] of Object.entries({
    owner: '00000000-0000-4000-8000-000000000001',
    id: '20000000-0000-4000-8000-000000000001',
    operation: 'issue',
    description: 'Lesson',
    quantity: '2',
    price: '40.00',
    confirmed: 'yes',
  }))
    data.set(key, value)
  return data
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ id: 7, role: 'administrator' })
  mocks.rpc.mockResolvedValue({ error: null })
})
describe('billing server boundary', () => {
  it('denies writes before touching privileged storage when staff auth fails', async () => {
    mocks.auth.mockRejectedValue(new Error('Forbidden'))
    await expect(manageBill({}, form())).rejects.toThrow('Forbidden')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('derives audit actor from staff session and computes item prices server-side', async () => {
    const data = form()
    data.set('actor', 'forged')
    data.set('total', '1')
    expect((await manageBill({}, data)).success).toBeDefined()
    expect(mocks.rpc).toHaveBeenCalledWith(
      'app_manage_bill',
      expect.objectContaining({
        p_actor: '7',
        p_items: [{ description: 'Lesson', quantity: 2, unit_amount_cents: 4000 }],
      }),
    )
  })
  it('rejects missing confirmation and invalid money', async () => {
    const data = form()
    data.delete('confirmed')
    expect((await manageBill({}, data)).error).toBeDefined()
    data.set('confirmed', 'yes')
    data.set('price', '-1')
    expect((await manageBill({}, data)).error).toBeDefined()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('does not claim success after a rejected atomic transition', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'stale' } })
    expect((await manageBill({}, form())).error).toBeDefined()
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })
})
