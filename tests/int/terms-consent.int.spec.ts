import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CalBooking } from '@/components/cal-booking'
import { GoogleSignInButton } from '@/app/(frontend)/login/google-sign-in-button'

vi.mock('@calcom/embed-react', () => ({
  default: () => createElement('div', { 'data-testid': 'booking-tool' }, 'Booking tool'),
  getCalApi: async () => vi.fn(),
}))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Website terms consent', () => {
  it('requires consent for Google registration and the associated email form', () => {
    render(createElement('div', null,
      createElement(GoogleSignInButton, { requireTerms: true }),
      createElement('form', { id: 'student-auth-form' }),
    ))
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    const button = screen.getByRole('button') as HTMLButtonElement
    expect(checkbox.checked).toBe(false)
    expect(checkbox.form?.checkValidity()).toBe(false)
    expect(button.disabled).toBe(true)
    fireEvent.click(checkbox)
    expect(checkbox.form?.checkValidity()).toBe(true)
    expect(button.disabled).toBe(false)
    fireEvent.click(checkbox)
    expect(button.disabled).toBe(true)
  })

  it('requires consent on the Google login entry too', () => {
    render(createElement(GoogleSignInButton, { requireTerms: true }))
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('loads booking only after consent and hides it when consent is withdrawn', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'linked', intentId: 'test', name: 'Test', email: 'test@example.com' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    render(createElement(CalBooking))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('booking-tool')).toBeNull()
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(screen.queryByTestId('booking-tool')).not.toBeNull())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.queryByTestId('booking-tool')).toBeNull()
  })
})
