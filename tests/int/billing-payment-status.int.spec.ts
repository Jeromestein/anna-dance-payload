import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { BillingPaymentStatus } from '@/components/billing-payment-status'
const refresh = vi.hoisted(() => vi.fn())
const router = { refresh }
vi.mock('next/navigation', () => ({ useRouter: () => router }))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})
describe('Payment confirmation refresh', () => {
  it('checks pending payment automatically, stops after a minute, and keeps manual checking available', () => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    render(createElement(BillingPaymentStatus))
    act(() => vi.advanceTimersByTime(65000))
    expect(refresh).toHaveBeenCalledTimes(12)
    fireEvent.click(screen.getByRole('button', { name: 'Check payment status' }))
    expect(refresh).toHaveBeenCalledTimes(13)
  })
  it('stops polling when the pending UI is replaced by the paid bill', () => {
    vi.useFakeTimers()
    const view = render(createElement(BillingPaymentStatus))
    view.unmount()
    act(() => vi.advanceTimersByTime(10000))
    expect(refresh).not.toHaveBeenCalled()
  })
})
