const requestRefund = vi.hoisted(() => vi.fn())
vi.mock('@/actions/stripe-billing', () => ({
  refundStripeBill: requestRefund,
  reconcileStripeBill: vi.fn(),
  checkoutStripeBill: vi.fn(),
  createStripeTestBill: vi.fn(),
  importStripePayment: vi.fn(),
}))
import { createElement } from 'react'
import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { BillingRefund, RefundLauncher, RefundProgress } from '@/components/billing-refund'
import type { Bill } from '@/lib/billing/model'
const action = vi.hoisted(() => vi.fn())
vi.mock('@/actions/billing', () => ({ manageBill: action }))
const bill: Bill = {
  id: 'bill-1',
  bill_number: 'ADA-001',
  amount_cents: 5000,
  currency: 'usd',
  status: 'paid',
  paid_amount_cents: 5000,
  due_date: null,
  created_at: '2026-09-09T12:00:00Z',
  paid_at: '2026-09-09T12:00:00Z',
  refunded_at: null,
  refund_reference: null,
  refund_reason: null,
  payment_channel: 'stripe',
  transaction_reference: 'pi_example',
  replaces_payment_id: null,
  app_payment_items: [{ description: 'Lesson', quantity: 1, unit_amount_cents: 5000 }],
}
// jsdom has no native dialog top layer; native modal behavior needs browser verification.
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open')
    },
  })
})
afterAll(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
function show(value = bill) {
  return render(
    createElement(BillingRefund, { owner: 'owner', ownerName: 'Student Example', bill: value }),
  )
}
describe('refund front end', () => {
  it('submits a verified full refund only after confirmation and shows provider errors', async () => {
    requestRefund.mockResolvedValue({ error: 'Stripe needs reconciliation.' })
    show({
      ...bill,
      refund_available: true,
      stripe_livemode: false,
      stripe_synced_at: '2026-09-10T10:00:00Z',
    })
    expect(screen.queryByText('Already refunded outside this website?')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Review full refund' }))
    fireEvent.change(screen.getByLabelText('Refund reason'), { target: { value: 'Test refund' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review confirmation' }))
    const submit = screen.getByRole('button', { name: 'Refund $50.00' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm the full/ }))
    fireEvent.click(submit)
    await waitFor(() => expect(requestRefund).toHaveBeenCalledTimes(1))
    const payload = requestRefund.mock.calls[0][1] as FormData
    expect(payload.get('id')).toBe(bill.id)
    expect(payload.get('reason')).toBe('Test refund')
    expect(payload.has('amount')).toBe(false)
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('Stripe needs reconciliation'),
    )
    expect(screen.queryByText('Full refund completed')).toBeNull()
  })

  it('shows refund controls with no records and completes a demo without calling the server', () => {
    render(
      createElement(RefundLauncher, {
        owner: 'owner',
        ownerName: 'Jason',
        bills: [],
        allowDemo: true,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Refund payment' }))
    expect(screen.getByRole('status').textContent).toContain('No payments available for refund')
    fireEvent.click(screen.getByRole('button', { name: 'Try refund demo' }))
    expect(screen.getByText('DEMO — sample payment, no money moves')).toBeDefined()
    expect(screen.queryByText('Already refunded outside this website?')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Review full refund' }))
    expect(screen.getByText('Full refund to Demo customer (not this student)')).toBeDefined()
    fireEvent.change(screen.getByLabelText('Refund reason'), { target: { value: 'Demo review' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review confirmation' }))
    const finish = screen.getByRole('button', {
      name: 'Finish demo — no money moves',
    }) as HTMLButtonElement
    expect(finish.disabled).toBe(true)
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm the full/ }))
    expect(finish.disabled).toBe(false)
    fireEvent.click(finish)
    expect(screen.getByRole('status').textContent).toContain('Demo complete — no refund sent')
    expect(screen.queryByText('Full refund completed')).toBeNull()
    expect(action).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Restart demo' }))
    expect(screen.getByRole('button', { name: 'Review full refund' })).toBeDefined()
  })
  it('keeps the demo accessible when billing cannot load', () => {
    render(
      createElement(RefundLauncher, {
        owner: 'owner',
        ownerName: 'Jason',
        bills: [],
        unavailable: true,
        allowDemo: true,
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Refund payment' }))
    expect(screen.getByRole('alert').textContent).toContain('could not be loaded')
    fireEvent.click(screen.getByRole('button', { name: 'Try refund demo' }))
    expect(screen.getByRole('button', { name: 'Review full refund' })).toBeDefined()
    expect(action).not.toHaveBeenCalled()
  })
  it('requires a reason and keeps actual refund submission disabled even after confirmation', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Review full refund' }))
    expect(screen.getByText('Full refund to Student Example')).toBeDefined()
    expect(
      (screen.getByRole('button', { name: 'Review confirmation' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Refund reason'), {
      target: { value: 'Schedule change' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Review confirmation' }))
    expect(screen.getByText('Schedule change')).toBeDefined()
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm the full/ }))
    const submit = screen.getByRole('button', {
      name: 'Refund $50.00 — unavailable',
    }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.click(submit)
    expect(action).not.toHaveBeenCalled()
    expect(screen.queryByText('Full refund completed')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: 'Review full refund' })).toBeDefined()
  })
  it('clears confirmation after going back and lets Escape cancel without submitting', () => {
    show({ ...bill, refund_available: true })
    fireEvent.click(screen.getByRole('button', { name: 'Review full refund' }))
    fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Refund reason'), {
      target: { value: 'Schedule change' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Review confirmation' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm the full/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    fireEvent.click(screen.getByRole('button', { name: 'Review confirmation' }))
    expect(
      (screen.getByRole('button', { name: 'Refund $50.00' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(requestRefund).not.toHaveBeenCalled()
  })

  it('keeps the modal open and blocks another submission while a refund is pending', async () => {
    let finish!: (result: { error: string }) => void
    requestRefund.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    show({ ...bill, refund_available: true, stripe_synced_at: '2026-09-17T12:00:00Z' })
    fireEvent.click(screen.getByRole('button', { name: 'Review full refund' }))
    fireEvent.change(within(screen.getByRole('dialog')).getByLabelText('Refund reason'), {
      target: { value: 'Schedule change' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Review confirmation' }))
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm the full/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Refund $50.00' }))
    await waitFor(() => expect(requestRefund).toHaveBeenCalledTimes(1))
    expect(
      (screen.getByRole('button', { name: 'Requesting refund…' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(
      (screen.getByRole('button', { name: 'Close refund dialog' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(screen.getByRole('dialog')).toBeDefined()
    finish({ error: 'Review the provider status before retrying.' })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('provider status'))
  })

  it('does not offer a new refund for refunded or unpaid bills', () => {
    const view = show({ ...bill, status: 'refunded' })
    expect(screen.getByText('Full refund completed')).toBeDefined()
    expect(screen.queryByRole('button')).toBeNull()
    view.rerender(
      createElement(BillingRefund, {
        owner: 'owner',
        ownerName: 'Student',
        bill: { ...bill, status: 'payment_due' },
      }),
    )
    expect(screen.queryByText('Full refund')).toBeNull()
  })
  it('requires a fully verified Stripe payment for the review flow', () => {
    show({ ...bill, paid_amount_cents: null })
    expect(
      (screen.getByRole('button', { name: 'Review full refund' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })
  it('keeps external-refund recording distinct from requesting a refund', () => {
    show()
    expect(screen.getByText('Already refunded outside this website?')).toBeDefined()
    expect(screen.getByText(/does not send money/)).toBeDefined()
  })
  it('presents pending and failure without showing success or a retry button', () => {
    const view = render(createElement(RefundProgress, { state: 'pending' }))
    expect(screen.getByRole('status').textContent).toContain('Do not submit another refund')
    view.rerender(createElement(RefundProgress, { state: 'failed' }))
    expect(screen.getByRole('alert').textContent).toContain('did not complete')
    expect(screen.queryByRole('button')).toBeNull()
  })
})
