import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { billingSummary, balanceDue, parseCents, readItems, type Bill } from '@/lib/billing/model'
import { BillingRecords } from '@/components/billing-records'
import { loadBills } from '@/lib/billing/load'

const bill: Bill = {
  id: 'bill-1',
  bill_number: 'ADA-001',
  amount_cents: 10000,
  currency: 'usd',
  status: 'payment_due',
  paid_amount_cents: 0,
  due_date: null,
  created_at: '2026-09-09T12:00:00Z',
  paid_at: null,
  refunded_at: null,
  refund_reference: null,
  refund_reason: null,
  payment_channel: null,
  transaction_reference: null,
  replaces_payment_id: null,
  app_payment_items: [{ description: 'Private lesson', quantity: 1, unit_amount_cents: 10000 }],
}
afterEach(cleanup)
describe('itemized billing', () => {
  it('distinguishes empty, unavailable, pending, paid, and fully refunded balances', () => {
    expect(billingSummary([])).toBe('No billing activity')
    expect(billingSummary([], true)).toBe('Billing unavailable')
    expect(billingSummary([bill])).toBe('$100.00 due')
    expect(billingSummary([{ ...bill, status: 'paid', paid_amount_cents: 10000 }])).toBe('All paid')
    expect(balanceDue({ ...bill, status: 'refunded', paid_amount_cents: 10000 })).toBe(0)
    expect(billingSummary([{ ...bill, status: 'refunded' }])).toBe('No payment due')
    expect(billingSummary([{ ...bill, status: 'pending_verification' }])).toBe(
      'Verification needed',
    )
  })
  it('does not combine amounts in different currencies', () => {
    expect(billingSummary([bill, { ...bill, id: '2', currency: 'eur' }])).toBe(
      '$100.00 due · €100.00 due',
    )
  })
  it('calculates prices in integer cents and rejects invalid item submissions', () => {
    expect(parseCents('19.99')).toBe(1999)
    expect(() => parseCents('1.999')).toThrow()
    expect(() => parseCents('-1')).toThrow()
    const form = new FormData()
    form.append('description', 'Lesson')
    form.append('quantity', '3')
    form.append('price', '19.99')
    expect(readItems(form)[0]).toEqual({
      description: 'Lesson',
      quantity: 3,
      unit_amount_cents: 1999,
    })
    form.set('quantity', '1.5')
    expect(() => readItems(form)).toThrow()
    form.set('quantity', '3')
    form.set('description', ' ')
    expect(() => readItems(form)).toThrow()
  })
  it('shows itemization and full refund without requesting another payment', () => {
    render(
      createElement(BillingRecords, {
        bills: [{ ...bill, status: 'refunded', paid_amount_cents: 10000 }],
        unavailable: false,
      }),
    )
    expect(screen.getAllByText('Fully refunded').length).toBeGreaterThan(0)
    expect(screen.getByText('$0.00')).toBeDefined()
    expect(screen.queryByRole('button', { name: /pay/i })).toBeNull()
  })
  it('reports query failure instead of no activity', () => {
    render(createElement(BillingRecords, { bills: [], unavailable: true }))
    expect(screen.getByRole('alert').textContent).toContain('could not be loaded')
    expect(screen.queryByText(/No billing activity/)).toBeNull()
  })
  it('does not calculate a total from truncated history', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [bill], count: 501, error: null }),
    }
    const result = await loadBills({ from: () => query } as never, 'owner')
    expect(result).toEqual({ bills: [], unavailable: true })
    expect(query.eq).toHaveBeenCalledWith('user_profile_id', 'owner')
  })
})
