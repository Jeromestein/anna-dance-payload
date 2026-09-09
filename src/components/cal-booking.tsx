'use client'

import Cal, { getCalApi } from '@calcom/embed-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const defaultCalLink = 'anna-dance/trial-class-consultation'
const defaultNamespace = 'trial-class-consultation'

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

type CalBookingProps = {
  allowGuest?: boolean
  calLink?: string
  namespace?: string
  loginNext?: string
}

export function CalBooking({
  allowGuest = false,
  calLink = defaultCalLink,
  namespace = defaultNamespace,
  loginNext = '/schedule#book',
}: CalBookingProps = {}) {
  const [context, setContext] = useState<ContextState>({ status: allowGuest ? 'public' : 'loading' })
  const [bookingReceived, setBookingReceived] = useState(false)

  useEffect(() => {
    if (allowGuest) return

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
  }, [allowGuest])

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
  }, [context, namespace])

  return (
    <>
      {!allowGuest ? <div className="booking-account-context" aria-live="polite">
        {context.status === 'loading' && <span>Preparing secure account matching…</span>}
        {context.status === 'linked' && (
          <span>
            Signed in as <strong>{context.email}</strong>. This booking will appear in My Account.
          </span>
        )}
        {context.status === 'public' && !allowGuest && (
          <div className="booking-login-required">
            <span>A Student account is required to book a class online.</span>
            <Link className="button" href={`/login?next=${encodeURIComponent(loginNext)}`}>
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
      </div> : null}
      {(context.status === 'linked' || (allowGuest && context.status === 'public')) && (
        <div className="cal-booking-shell">
          <Cal
            namespace={namespace}
            calLink={calLink}
            style={{ width: '100%', height: '100%', overflow: 'auto' }}
            config={{
              layout: 'month_view',
              useSlotsViewOnSmallScreen: 'true',
              ...(context.status === 'linked' ? {
                name: context.name,
                email: context.email,
                'metadata[bookingIntentId]': context.intentId,
              } : {}),
            }}
          />
        </div>
      )}
    </>
  )
}
