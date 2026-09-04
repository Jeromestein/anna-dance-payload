'use client'

import Cal, { getCalApi } from '@calcom/embed-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const calLink = 'anna-dance/trial-class-consultation'
const namespace = 'trial-class-consultation'

type BookingContext = {
  status: 'linked'
  intentId: string
  name: string
  email: string
  expiresAt: string
}

type BookingContextResponse = BookingContext | { status: 'public' }

type ContextState =
  { status: 'loading' } | { status: 'public' } | { status: 'unavailable' } | BookingContext

export function CalBooking() {
  const [context, setContext] = useState<ContextState>({ status: 'loading' })
  const [bookingReceived, setBookingReceived] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    void fetch('/api/integrations/cal/booking-intent', {
      method: 'POST',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          setContext({ status: 'unavailable' })
          return
        }

        const value = (await response.json()) as BookingContextResponse
        setContext(value.status === 'linked' ? value : { status: 'public' })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setContext({ status: 'unavailable' })
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (context.status !== 'linked') return

    void (async () => {
      const cal = await getCalApi({ namespace })
      cal('ui', { hideEventTypeDetails: false, layout: 'month_view' })
      cal('on', {
        action: 'bookingSuccessfulV2',
        callback: () => setBookingReceived(true),
      })
    })()
  }, [context])

  return (
    <>
      <div className="booking-account-context" aria-live="polite">
        {context.status === 'loading' && <span>Preparing secure account matching…</span>}
        {context.status === 'linked' && (
          <span>
            Signed in as <strong>{context.email}</strong>. This booking will appear in My Account.
          </span>
        )}
        {context.status === 'public' && (
          <div className="booking-login-required">
            <span>A Student account is required to book a class online.</span>
            <Link className="button" href="/login?next=/schedule%23book">
              Log in to book
            </Link>
          </div>
        )}
        {context.status === 'unavailable' && (
          <span>Online class booking is temporarily unavailable. Please call 701-400-9213.</span>
        )}
        {bookingReceived && (
          <strong className="booking-sync-status">
            Appointment received. Your account will update after secure confirmation.
          </strong>
        )}
      </div>
      {context.status === 'linked' && (
        <div className="cal-booking-shell">
          <Cal
            namespace={namespace}
            calLink={calLink}
            style={{ width: '100%', height: '100%', overflow: 'auto' }}
            config={{
              layout: 'month_view',
              useSlotsViewOnSmallScreen: 'true',
              name: context.name,
              email: context.email,
              'metadata[bookingIntentId]': context.intentId,
            }}
          />
        </div>
      )}
    </>
  )
}
