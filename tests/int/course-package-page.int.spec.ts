import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import PackagePage from '@/app/(frontend)/classes/[packageId]/page'
const m = vi.hoisted(() => ({ claims: vi.fn(), existing: vi.fn(), profile: vi.fn() }))
vi.mock('@/lib/supabase/config', () => ({ isSupabaseConfigured: () => true }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getClaims: m.claims },
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        neq: () => q,
        maybeSingle: m.existing,
        single: m.profile,
      }
      return q
    },
  }),
}))
vi.mock('@/lib/stripe/config', () => ({
  stripeAvailability: () => ({ mode: 'test', enabled: true }),
}))
vi.mock('@/actions/course-package', () => ({
  purchasePackage: vi.fn(),
  changePackagePaymentMethod: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`)
  },
  notFound: () => {
    throw new Error('NOT_FOUND')
  },
}))
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('STRIPE_MODE', 'test')
  m.claims.mockResolvedValue({ data: { claims: { sub: 'owner' } }, error: null })
  m.profile.mockResolvedValue({ data: { name: 'Student' }, error: null })
  m.existing.mockResolvedValue({ data: null, error: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})
describe('Authenticated package confirmation', () => {
  it('shows the selected CSV package and both payment choices', async () => {
    render(await PackagePage({ params: Promise.resolve({ packageId: 'SOLO-01' }) }))
    expect(screen.getByText('$360.00')).toBeDefined()
    expect(screen.getByText('9 lessons · 30 minutes each · One student')).toBeDefined()
    expect(screen.getByText('Friday · 16:30–17:00')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Pay Online' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Pay in Cash' })).toBeDefined()
  })
  it('redirects to the saved quote instead of offering the catalog amount again', async () => {
    m.existing.mockResolvedValue({ data: { id: 'saved-discount' }, error: null })
    await expect(
      PackagePage({ params: Promise.resolve({ packageId: 'level-1' }) }),
    ).rejects.toThrow('REDIRECT:/account/billing/saved-discount')
  })
  it('requires sign-in before querying purchases', async () => {
    m.claims.mockResolvedValue({ data: null, error: null })
    await expect(
      PackagePage({ params: Promise.resolve({ packageId: 'level-1' }) }),
    ).rejects.toThrow('REDIRECT:/login?next=%2Fclasses%2Flevel-1')
    expect(m.existing).not.toHaveBeenCalled()
  })
  it('fails closed when the package migration or bill lookup is unavailable', async () => {
    m.existing.mockResolvedValue({ data: null, error: { code: '42703' } })
    render(await PackagePage({ params: Promise.resolve({ packageId: 'level-1' }) }))
    expect(screen.getByRole('alert')).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Pay Online' })).toBeNull()
  })
})
