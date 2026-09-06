import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  buildCalSessionKey,
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
      sessionKey: 'event:42:2026-09-10T17:00:00.000Z',
      seatCapacity: null,
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

  it('normalizes a seated class and gives every attendee webhook the same session key', () => {
    const firstSeat = JSON.stringify({
      triggerEvent: 'BOOKING_CREATED',
      payload: {
        uid: 'shared-session-booking-uid',
        type: 'level-class',
        eventTypeId: 81,
        seatsPerTimeSlot: 20,
        startTime: '2026-09-12T16:00:00.000Z',
        attendees: [{ name: 'First Student', email: 'first@example.com' }],
        metadata: { bookingIntentId: '11111111-1111-4111-8111-111111111111' },
      },
    })
    const secondSeat = JSON.stringify({
      triggerEvent: 'BOOKING_CREATED',
      payload: {
        uid: 'shared-session-booking-uid',
        type: 'level-class',
        eventTypeId: 81,
        seatsPerTimeSlot: 20,
        startTime: '2026-09-12T16:00:00.000Z',
        attendees: [{ name: 'Second Student', email: 'second@example.com' }],
        metadata: { bookingIntentId: '22222222-2222-4222-8222-222222222222' },
      },
    })

    expect(parseCalWebhook(firstSeat)).toMatchObject({
      entryType: 'class',
      attendeeEmail: 'first@example.com',
      bookingIntentId: '11111111-1111-4111-8111-111111111111',
      seatCapacity: 20,
      sessionKey: 'event:81:2026-09-12T16:00:00.000Z',
    })
    expect(parseCalWebhook(secondSeat)).toMatchObject({
      entryType: 'class',
      attendeeEmail: 'second@example.com',
      bookingIntentId: '22222222-2222-4222-8222-222222222222',
      seatCapacity: 20,
      sessionKey: 'event:81:2026-09-12T16:00:00.000Z',
    })
  })

  it('builds stable session keys only when event and timing data are usable', () => {
    expect(buildCalSessionKey(null, 'Duet-Class', '2026-09-12T16:00:00Z')).toBe(
      'slug:duet-class:2026-09-12T16:00:00.000Z',
    )
    expect(buildCalSessionKey(null, null, '2026-09-12T16:00:00Z')).toBeNull()
    expect(buildCalSessionKey(81, 'level-class', 'not-a-date')).toBeNull()
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
