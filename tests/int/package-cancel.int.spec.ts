import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PackageCancel } from '@/components/package-cancel'
import { BillingRecords } from '@/components/billing-records'
import type { Bill } from '@/lib/billing/model'
const cancel = vi.hoisted(() => vi.fn())
vi.mock('@/actions/course-package', () => ({ cancelPackagePurchase: cancel }))
vi.mock('@/components/stripe-billing-controls', () => ({ StripeCheckout: () => null }))
beforeEach(() => {
  vi.clearAllMocks()
  cancel.mockResolvedValue({})
})
afterEach(cleanup)
const bill = {
  id: 'test-order',
  package_id: 'level-1',
  bill_number: 'ADA-TEST',
  amount_cents: 31000,
  paid_amount_cents: 0,
  currency: 'usd',
  status: 'payment_due',
  created_at: '2026-09-24',
  app_payment_items: [
    { description: 'level-1', quantity: 1, unit_amount_cents: null, credit_count: 10 },
  ],
} as Bill

describe('Student cancellation UI', () => {
  it('requires a second click and allows keeping the order without submitting', async () => {
    render(createElement(PackageCancel, { id: bill.id }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }))
    expect(cancel).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Keep order' }))
    expect(screen.queryByRole('button', { name: 'Confirm cancellation' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
    await waitFor(() => expect(cancel).toHaveBeenCalledOnce())
    expect(cancel.mock.calls[0][1].get('id')).toBe(bill.id)
    expect(cancel.mock.calls[0][1].get('confirmed')).toBe('yes')
  })
  it.each(['paid', 'pending_verification', 'refunded', 'cancelled'] as const)(
    'does not offer cancellation for %s orders',
    (status) => {
      render(createElement(BillingRecords, { bills: [{ ...bill, status }], unavailable: false }))
      expect(screen.queryByRole('button', { name: 'Cancel order', hidden: true })).toBeNull()
    },
  )
  it('keeps cancelled records in a closed history and offers Classes', () => {
    render(
      createElement(BillingRecords, {
        bills: [{ ...bill, status: 'cancelled' }],
        unavailable: false,
      }),
    )
    const history = screen.getByText('Cancelled orders (1)').closest('details')!
    expect(history.open).toBe(false)
    expect(screen.getByRole('link', { name: 'Classes' }).getAttribute('href')).toBe('/classes')
  })
})
