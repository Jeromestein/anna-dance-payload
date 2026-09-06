import { describe, expect, it } from 'vitest'

import { groupCalAppointments } from '@/lib/cal/appointment-sessions'

describe('Cal.com appointment sessions', () => {
  it('groups attendee seats and excludes cancelled seats from the occupied count', () => {
    const sessions = groupCalAppointments([
      {
        id: 'seat-one',
        cal_booking_uid: 'shared-booking',
        cal_session_key: 'event:81:2026-09-12T16:00:00.000Z',
        seat_capacity: 20,
        status: 'scheduled',
      },
      {
        id: 'seat-two',
        cal_booking_uid: 'shared-booking',
        cal_session_key: 'event:81:2026-09-12T16:00:00.000Z',
        seat_capacity: 20,
        status: 'cancelled',
      },
    ])

    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      key: 'event:81:2026-09-12T16:00:00.000Z',
      bookedSeats: 1,
      capacity: 20,
    })
    expect(sessions[0].appointments).toHaveLength(2)
  })

  it('keeps legacy one-to-one bookings separated by their provider UID', () => {
    const sessions = groupCalAppointments([
      {
        id: 'booking-one',
        cal_booking_uid: 'uid-one',
        cal_session_key: null,
        seat_capacity: null,
        status: 'scheduled',
      },
      {
        id: 'booking-two',
        cal_booking_uid: 'uid-two',
        cal_session_key: null,
        seat_capacity: null,
        status: 'scheduled',
      },
    ])

    expect(sessions.map((session) => session.key)).toEqual(['uid-one', 'uid-two'])
  })
})
