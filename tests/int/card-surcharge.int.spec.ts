import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { cardSurchargeCents, billPaymentQuote } from '@/lib/billing/card-surcharge'
import { checkoutItems } from '@/lib/billing/checkout-items'
import { IssueBill } from '@/components/billing-issue'
import { StripeCheckout } from '@/components/stripe-billing-controls'

vi.mock('@/actions/billing', () => ({ manageBill: vi.fn() }))
vi.mock('@/actions/billing-notifications', () => ({ sendBillingEmail: vi.fn() }))

vi.mock('@/actions/stripe-billing', () => ({
  checkoutStripeBill: vi.fn(),
  createStripeTestBill: vi.fn(),
  importStripePayment: vi.fn(),
  reconcileStripeBill: vi.fn(),
}))
afterEach(cleanup)

describe('Stripe fee amounts and disclosure', () => {
  it.each([
    [10000, 300],
    [31000, 930],
    [10001, 300],
    [50, 1],
  ])('calculates %i cents without exceeding 3%%', (subtotal, fee) => {
    expect(cardSurchargeCents(subtotal)).toBe(fee)
    expect(fee).toBeLessThanOrEqual(subtotal * 0.03)
  })
  it.each([-1, 49, 100.5, NaN, Infinity, 10000001])('rejects invalid subtotal %s', (subtotal) => {
    expect(() => cardSurchargeCents(subtotal)).toThrow()
  })
  it('preserves the course subtotal and refuses a mismatched or unmarked fee', () => {
    const items = [{ description: 'Lessons', quantity: 2, unit_amount_cents: 5000 }]
    const bill = {
      amount_cents: 10300,
      currency: 'usd',
      card_surcharge_cents: 300,
      card_payment_kind: 'stripe',
    }
    const lines = checkoutItems(bill, items)
    expect(lines.map((i) => i.quantity! * i.price_data!.unit_amount!)).toEqual([10000, 300])
    expect(() => checkoutItems({ ...bill, card_surcharge_cents: 299 }, items)).toThrow()
    expect(() => checkoutItems({ ...bill, card_payment_kind: null }, items)).toThrow()
  })
  it('discloses a universal Stripe fee without a card-type choice', () => {
    render(
      createElement(StripeCheckout, {
        id: 'bill',
        surcharge: { subtotal: 10000, currency: 'usd' },
      }),
    )
    expect(screen.getByRole('button', { name: 'Pay $103.00' })).toBeTruthy()
    expect(screen.getByText('Stripe processing fee (3%)')).toBeTruthy()
    expect(screen.getByText('$3.00')).toBeTruthy()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(
      screen.getByText('A 3% processing fee applies to all payments made through Stripe.'),
    ).toBeTruthy()
  })
  it('does not display or add a fee when the feature is disabled', () => {
    render(createElement(StripeCheckout, { id: 'bill', amountLabel: '$100.00' }))
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByText('Stripe processing fee (3%)')).toBeNull()
    expect(screen.getByRole('button', { name: 'Pay $100.00' })).toBeTruthy()
  })
  it('uses a saved course consent without asking the student to agree again', () => {
    render(
      createElement(StripeCheckout, {
        id: 'bill',
        amountLabel: '$103.00',
        acknowledgement: {
          note: '',
          accepted_at: '2026-09-29T00:00:00Z',
          terms_version: 'website-terms-2026-09-10',
        },
      }),
    )
    expect(screen.queryByRole('checkbox', { name: /Website Terms of Use/ })).toBeNull()
    expect(screen.getByText(/agreement to the Website Terms of Use was saved/)).toBeTruthy()
    expect(
      (screen.getByRole('textbox', { name: /Message for the teacher/ }) as HTMLTextAreaElement)
        .readOnly,
    ).toBe(false)
  })
  it('still asks for terms on a bill without saved consent', () => {
    render(createElement(StripeCheckout, { id: 'bill', amountLabel: '$100.00' }))
    expect(screen.getByRole('checkbox', { name: /Website Terms of Use/ })).toBeTruthy()
  })
})

describe('Admin payment-link fee preview', () => {
  it('adds the fee to an original price while preserving the submitted original amount', () => {
    render(
      createElement(IssueBill, {
        owner: 'owner',
        ownerName: 'Test Student',
        bills: [],
        id: 'bill',
        test: true,
        surchargeEnabled: true,
      }),
    )
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'Original price before Stripe fee (USD)' }),
      { target: { value: '100' } },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Review payment details' }))
    expect(screen.getByText('Stripe processing fee (3%)')).toBeTruthy()
    expect(screen.getByText('$3.00')).toBeTruthy()
    expect(screen.getByText('$103.00')).toBeTruthy()
    const form = screen.getByRole('button', { name: 'Create payment link' }).closest('form')!
    expect(new FormData(form).get('total_price')).toBe('100')
  })
  it('previews the same total before and after checkout reservation without compounding', () => {
    const original = {
      amount_cents: 10000,
      card_surcharge_cents: 0,
      surcharge_available: true,
      status: 'payment_due',
      currency: 'usd',
    }
    expect(billPaymentQuote(original)).toEqual({ subtotal: 10000, fee: 300, total: 10300 })
    expect(
      billPaymentQuote({ ...original, amount_cents: 10300, card_surcharge_cents: 300 }),
    ).toEqual({ subtotal: 10000, fee: 300, total: 10300 })
    expect(billPaymentQuote({ ...original, status: 'paid' }).total).toBe(10000)
    expect(billPaymentQuote({ ...original, payment_preference: 'cash' }).total).toBe(10000)
  })
})
