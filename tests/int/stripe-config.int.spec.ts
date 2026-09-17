// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stripeAvailability } from '@/lib/stripe/config'
import { loadBills } from '@/lib/billing/load'
import type { SupabaseClient } from '@supabase/supabase-js'

beforeEach(() => {
  vi.stubEnv('STRIPE_MODE', 'live')
  vi.stubEnv('STRIPE_SECRET_KEY', 'rk_live_fixture')
  vi.stubEnv('STRIPE_ACCOUNT_ID', 'acct_fixture')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_fixture')
  vi.stubEnv('STRIPE_LIVE_PAYMENTS_ENABLED', '')
  vi.stubEnv('STRIPE_LIVE_REFUNDS_ENABLED', '')
})
afterEach(() => vi.unstubAllEnvs())

describe('independent live payment and refund gates', () => {
  it.each([
    ['', '', false, false],
    ['true', '', true, false],
    ['', 'true', false, true],
    ['true', 'true', true, true],
    ['false', 'false', false, false],
  ])('payments=%s refunds=%s', (payments, refunds, enabled, refundEnabled) => {
    vi.stubEnv('STRIPE_LIVE_PAYMENTS_ENABLED', payments)
    vi.stubEnv('STRIPE_LIVE_REFUNDS_ENABLED', refunds)
    expect(stripeAvailability()).toEqual({ mode: 'live', enabled, refundEnabled })
  })

  it('keeps both operations enabled in an isolated test environment', () => {
    vi.stubEnv('STRIPE_MODE', 'test')
    vi.stubEnv('STRIPE_SECRET_KEY', 'rk_test_fixture')
    expect(stripeAvailability()).toEqual({ mode: 'test', enabled: true, refundEnabled: true })
  })

  it('fails closed when the key mode does not match', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'rk_test_fixture')
    vi.stubEnv('STRIPE_LIVE_PAYMENTS_ENABLED', 'true')
    vi.stubEnv('STRIPE_LIVE_REFUNDS_ENABLED', 'true')
    expect(stripeAvailability()).toEqual({ mode: null, enabled: false, refundEnabled: false })
  })

  it('exposes Admin refunds without exposing Checkout or sandbox bill refunds', async () => {
    vi.stubEnv('STRIPE_LIVE_REFUNDS_ENABLED', 'true')
    const query: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order']) query[method] = () => query
    query.limit = async () => ({
      count: 2,
      data: [true, false].map((stripe_livemode) => ({
        status: 'payment_due', payment_channel: 'stripe', stripe_livemode,
        stripe_synced_at: '2026-09-17T12:00:00Z',
      })),
    })
    const client = { from: () => query } as unknown as SupabaseClient
    const { bills } = await loadBills(client, 'owner')
    expect(bills[0]).toMatchObject({
      checkout_available: false, refund_available: true, website_refunds_disabled: false,
    })
    expect(bills[1]).toMatchObject({ checkout_available: false, refund_available: false })
  })
})
