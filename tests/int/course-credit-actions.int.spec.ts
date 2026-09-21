// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  rpc: vi.fn(),
  ctx: vi.fn(),
  product: vi.fn(),
  settings: vi.fn(),
  revalidate: vi.fn(),
}))
vi.mock('@/lib/staff/auth', () => ({ requirePayloadAdministrator: m.auth }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: () => ({ rpc: m.rpc }) }))
vi.mock('@/lib/stripe/config', () => ({ stripeContext: m.ctx, stripeSettings: m.settings }))
vi.mock('next/cache', () => ({ revalidatePath: m.revalidate }))
import { manageCourseSchedule } from '@/actions/course-schedule'
import { manageBill } from '@/actions/billing'
const owner = '00000000-0000-4000-8000-000000000001'
const item = '70000000-0000-4000-8000-000000000001'
const request = '80000000-0000-4000-8000-000000000001'
beforeEach(() => {
  vi.resetAllMocks()
  m.auth.mockResolvedValue({ id: 42 })
  m.rpc.mockResolvedValue({ data: request })
  m.settings.mockReturnValue({ mode: 'live' })
  m.ctx.mockResolvedValue({
    mode: 'live',
    livemode: true,
    account: 'acct_fixture',
    stripe: { products: { retrieve: m.product } },
  })
  m.product.mockRejectedValue(new Error('Catalog unavailable'))
})
function form(values: Record<string, string>) {
  const f = new FormData()
  Object.entries(values).forEach(([k, v]) => f.set(k, v))
  return f
}
describe('course issuance boundary', () => {
  it('issues without catalog access and ignores submitted product ids or prices', async () => {
    const f = form({
      owner,
      id: request,
      operation: 'issue',
      confirmed: 'yes',
      bill_kind: 'courses',
      total_price: '173.29',
      course_key: 'solo30',
      credit_count: '3',
      stripe_product_id: 'prod_forged',
      unit_amount_cents: '1',
    })
    expect(await manageBill({}, f)).toHaveProperty('success')
    expect(m.product).not.toHaveBeenCalled()
    expect(m.rpc).toHaveBeenCalledWith(
      'app_issue_course_bill',
      expect.objectContaining({
        p_total: 17329,
        p_account: 'acct_fixture',
        p_live: true,
        p_items: [
          expect.objectContaining({
            stripe_product_id: null,
            credit_count: 3,
            unit_amount_cents: null,
          }),
        ],
      }),
    )
  })
  it('still requires verified merchant context before issuing a course bill', async () => {
    m.ctx.mockRejectedValue(new Error('Stripe account does not match configuration.'))
    const result = await manageBill(
      {},
      form({
        owner,
        id: request,
        operation: 'issue',
        confirmed: 'yes',
        bill_kind: 'courses',
        total_price: '50',
        course_key: 'solo30',
        credit_count: '1',
      }),
    )
    expect(result).toHaveProperty('error')
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it('preserves sandbox identity without a product catalog', async () => {
    m.ctx.mockResolvedValue({ account: 'acct_fixture', livemode: false })
    const result = await manageBill(
      {},
      form({
        owner,
        id: request,
        operation: 'issue',
        confirmed: 'yes',
        bill_kind: 'courses',
        total_price: '50',
        course_key: 'solo30',
        credit_count: '1',
      }),
    )
    expect(result).toHaveProperty('success')
    expect(m.rpc.mock.calls[0][1]).toMatchObject({ p_account: 'acct_fixture', p_live: false })
  })
})
describe('staff schedule actions', () => {
  it('authorizes before processing or writing', async () => {
    m.auth.mockRejectedValue(new Error('not admin'))
    await expect(manageCourseSchedule({}, form({ owner, item }))).rejects.toThrow('not admin')
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it('uses repeatable identities and preserves New York wall time across DST', async () => {
    const f = form({
      owner,
      item,
      operation: 'create',
      request,
      local: '2026-10-25T10:00',
      weeks: '2',
      location: 'Studio',
    })
    await manageCourseSchedule({}, f)
    await manageCourseSchedule({}, f)
    expect(m.rpc.mock.calls[0]).toEqual(m.rpc.mock.calls[1])
    const args = m.rpc.mock.calls[0][1]
    expect(args.p_entries.map((e: { starts_at: string }) => e.starts_at)).toEqual([
      '2026-10-25T14:00:00.000Z',
      '2026-11-01T15:00:00.000Z',
    ])
    expect(args.p_actor).toBe('42')
  })
  it('rejects forged sandbox scheduling in live mode and invalid times', async () => {
    const f = form({
      owner,
      item,
      operation: 'create',
      request,
      local: '2026-11-01T01:30',
      weeks: '1',
    })
    expect(await manageCourseSchedule({}, f)).toHaveProperty('error')
    f.set('test', 'yes')
    expect(await manageCourseSchedule({}, f)).toHaveProperty('error')
    expect(m.rpc).not.toHaveBeenCalled()
  })
})
