import { describe, expect, it, vi } from 'vitest'
import { queryBilling } from '@/lib/billing/query.server'
import { billSelect } from '@/lib/billing/model'
describe('Additive package rollout', () => {
  it('keeps historical bills readable when package columns do not exist yet', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: { code: '42703', message: 'column app_payments.package_id does not exist' },
      })
      .mockResolvedValueOnce({ data: [{ id: 'old-bill' }], error: null })
    expect(await queryBilling(query)).toMatchObject({ data: [{ id: 'old-bill' }] })
    expect(query.mock.calls[0][0]).toBe(billSelect)
    expect(query.mock.calls[1][0]).not.toContain('package_id')
  })
  it.each(['42501', 'PGRST301', '08006'])(
    'does not hide access or connection failure %s',
    async (code) => {
      const query = vi
        .fn()
        .mockResolvedValue({ data: null, error: { code, message: 'package_id unavailable' } })
      expect((await queryBilling(query)).error?.code).toBe(code)
      expect(query).toHaveBeenCalledOnce()
    },
  )
})
