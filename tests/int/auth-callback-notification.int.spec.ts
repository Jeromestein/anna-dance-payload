import { createElement } from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  setSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth }) }))

import AuthCallbackPage from '@/app/(frontend)/auth/callback/page'

const redirect = vi.fn()
const send = vi.fn()

function visit(suffix: string) {
  const originalWindow = window
  vi.stubGlobal(
    'window',
    new Proxy(originalWindow, {
      get(target, property) {
        if (property === 'location') {
          return { href: `https://academy.example/auth/callback${suffix}`, replace: redirect }
        }
        return Reflect.get(target, property, target)
      },
    }),
  )
  return render(createElement(AuthCallbackPage))
}

beforeEach(() => {
  vi.resetAllMocks()
  auth.setSession.mockResolvedValue({ error: null })
  auth.exchangeCodeForSession.mockResolvedValue({ error: null })
  auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'student' } } } })
  send.mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', send)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Successful Auth callback notification', () => {
  it.each(['?code=test-code', '#access_token=test-access&refresh_token=test-refresh', ''])(
    'requests notification after establishing the session via %s',
    async (suffix) => {
      visit(suffix)
      await waitFor(() => expect(redirect).toHaveBeenCalledWith('/account'))
      expect(send).toHaveBeenCalledExactlyOnceWith('/api/auth/registration-notification', {
        method: 'POST',
        signal: expect.any(AbortSignal),
      })
      expect(send.mock.invocationCallOrder[0]).toBeLessThan(redirect.mock.invocationCallOrder[0])
    },
  )

  it('still redirects to the safe destination after a notification network failure', async () => {
    send.mockRejectedValue(new TypeError('Network unavailable'))
    visit('?code=test-code&next=%2Faccount%3Ftab%3Dschedule')
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('/account?tab=schedule'))
  })

  it('still redirects after a non-successful notification response', async () => {
    send.mockResolvedValue(new Response(null, { status: 503 }))
    visit('?code=test-code&next=https%3A%2F%2Funtrusted.example')
    await waitFor(() => expect(redirect).toHaveBeenCalledWith('/account'))
  })

  it('does not request a notification when authentication fails', async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: new Error('Invalid code') })
    const screen = visit('?code=invalid')
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(send).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })
})
