import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  isAllowedCalEventType,
  normalizeEmail,
  parseCalWebhook,
  verifyCalWebhookSignature,
} from '@/lib/cal/booking-sync'

const payload = JSON.stringify({
  triggerEvent: 'BOOKING_CREATED',
  createdAt: '2026-09-04T18:00:00.000Z',
  payload: {
    uid: 'cal-booking-123',
    title: 'Trial Class Consultation',
    type: 'trial-class-consultation',
    eventTypeId: 42,
    startTime: '2026-09-10T17:00:00.000Z',
    endTime: '2026-09-10T17:30:00.000Z',
    location: 'Anna Dance Academy',
    attendees: [
      {
        name: 'Test Student',
        email: 'TEST@example.com ',
        timeZone: 'America/New_York',
      },
    ],
    metadata: {
      bookingIntentId: 'a02e6eba-34cc-458f-872c-1d3c336c31dd',
    },
  },
})

describe('Cal.com booking synchronization', () => {
  it('verifies the raw webhook body with the configured secret', () => {
    const secret = 'test-webhook-secret'
    const signature = createHmac('sha256', secret).update(payload).digest('hex')

    expect(verifyCalWebhookSignature(payload, signature, secret)).toBe(true)
    expect(verifyCalWebhookSignature(`${payload} `, signature, secret)).toBe(false)
    expect(verifyCalWebhookSignature(payload, 'not-a-signature', secret)).toBe(false)
  })

  it('normalizes the provider payload and preserves the booking intent', () => {
    expect(parseCalWebhook(payload)).toEqual({
      triggerEvent: 'BOOKING_CREATED',
      uid: 'cal-booking-123',
      title: 'Trial Class Consultation',
      startsAt: '2026-09-10T17:00:00.000Z',
      endsAt: '2026-09-10T17:30:00.000Z',
      timezone: 'America/New_York',
      location: 'Anna Dance Academy',
      status: 'scheduled',
      entryType: 'consultation',
      attendeeName: 'Test Student',
      attendeeEmail: 'test@example.com',
      eventTypeId: 42,
      eventTypeSlug: 'trial-class-consultation',
      bookingIntentId: 'a02e6eba-34cc-458f-872c-1d3c336c31dd',
      rescheduledFromUid: null,
    })
  })

  it('maps cancellation state and rejects unsupported payloads', () => {
    const cancelled = JSON.stringify({
      triggerEvent: 'BOOKING_CANCELLED',
      payload: {
        uid: 'cal-booking-123',
        type: 'trial-class-consultation',
      },
    })

    expect(parseCalWebhook(cancelled)?.status).toBe('cancelled')
    expect(parseCalWebhook('{')).toBeNull()
    expect(parseCalWebhook(JSON.stringify({ triggerEvent: 'FORM_SUBMITTED' }))).toBeNull()
    expect(
      parseCalWebhook(
        JSON.stringify({
          triggerEvent: 'BOOKING_CANCELLED',
          payload: { rescheduleUid: 'not-the-current-booking-uid' },
        }),
      ),
    ).toBeNull()
  })

  it('keeps the previous booking UID when Cal.com reschedules into a new booking', () => {
    const rescheduled = JSON.stringify({
      triggerEvent: 'BOOKING_RESCHEDULED',
      payload: {
        uid: 'new-booking-uid',
        rescheduleUid: 'previous-booking-uid',
        type: 'trial-class-consultation',
      },
    })

    expect(parseCalWebhook(rescheduled)).toMatchObject({
      uid: 'new-booking-uid',
      rescheduledFromUid: 'previous-booking-uid',
      status: 'changed',
    })
  })

  it('allows only configured event type slugs', () => {
    expect(isAllowedCalEventType('trial-class-consultation')).toBe(true)
    expect(
      isAllowedCalEventType('private-lesson', 'trial-class-consultation, private-lesson'),
    ).toBe(true)
    expect(isAllowedCalEventType('unrelated-event')).toBe(false)
  })

  it('normalizes attendee emails without treating blank values as identities', () => {
    expect(normalizeEmail(' Family@Example.com ')).toBe('family@example.com')
    expect(normalizeEmail('')).toBeNull()
  })
})
