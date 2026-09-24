'use client'

import Cal, { getCalApi } from '@calcom/embed-react'
import { TermsConsent } from './terms-consent'
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
  calLink?: string
  namespace?: string
}

export function CalBooking({
  calLink = defaultCalLink,
  namespace = defaultNamespace,
}: CalBookingProps = {}) {
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [context, setContext] = useState<ContextState>({ status: 'loading' })
  const [bookingReceived, setBookingReceived] = useState(false)

  useEffect(() => {
    if (!termsAccepted) return
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
  }, [termsAccepted])

  useEffect(() => {
    if (!termsAccepted || (context.status !== 'linked' && context.status !== 'public')) return

    void (async () => {
      const cal = await getCalApi({ namespace })
      cal('ui', { hideEventTypeDetails: false, layout: 'month_view' })
      cal('on', {
        action: 'bookingSuccessfulV2',
        callback: () => setBookingReceived(true),
      })
    })()
  }, [context, namespace, termsAccepted])

  return (
    <>
      <TermsConsent
        checked={termsAccepted}
        onChange={(accepted) => {
          setContext({ status: 'loading' })
          setBookingReceived(false)
          setTermsAccepted(accepted)
        }}
      />
      {!termsAccepted && <p>Please agree to the Website Terms of Use to continue booking.</p>}
      {termsAccepted && (
        <div className="booking-account-context" aria-live="polite">
          {context.status === 'loading' && <span>Preparing your booking…</span>}
          {context.status === 'linked' && (
            <span>
              Signed in as <strong>{context.email}</strong>. This booking will appear in My Account.
            </span>
          )}
          {context.status === 'public' && (
            <span>Book as a guest using your name and email. No login required.</span>
          )}
          {context.status === 'unavailable' && (
            <span>Online class booking is temporarily unavailable. Please call 701-400-9213.</span>
          )}
          {bookingReceived && (
            <strong className="booking-sync-status">
              {context.status === 'linked'
                ? 'Appointment received. Your account will update after secure confirmation.'
                : 'Appointment received. Please check your email for confirmation.'}
            </strong>
          )}
        </div>
      )}
      {termsAccepted && (context.status === 'linked' || context.status === 'public') && (
        <div className="cal-booking-shell">
          <Cal
            namespace={namespace}
            calLink={calLink}
            style={{ width: '100%', height: '100%', overflow: 'auto' }}
            config={{
              layout: 'month_view',
              useSlotsViewOnSmallScreen: 'true',
              ...(context.status === 'linked'
                ? {
                    name: context.name,
                    email: context.email,
                    'metadata[bookingIntentId]': context.intentId,
                  }
                : {}),
            }}
          />
        </div>
      )}
    </>
  )
}
