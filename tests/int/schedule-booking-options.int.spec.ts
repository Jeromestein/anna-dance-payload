import { describe, expect, it } from 'vitest'
import { consultationBooking, getProgramBookings, getScheduleBooking, paidClassBookings, scheduleBookings } from '@/lib/cal/booking-options'
import { isAllowedCalEventType } from '@/lib/cal/booking-sync'

describe('Schedule booking access', () => {
  it('always selects free consultation for visitors, including paid query parameters', () => {
    for (const option of paidClassBookings) {
      expect(getScheduleBooking(false, option.slug)).toBe(consultationBooking)
    }
    expect(getScheduleBooking(false)).toBe(consultationBooking)
  })

  it('offers free trial and four paid classes and defaults signed-in students to free trial', () => {
    expect(scheduleBookings).toHaveLength(5)
    for (const option of scheduleBookings) {
      expect(getScheduleBooking(true, option.slug)).toBe(option)
    }
    for (const query of [undefined, 'trial-class-consultation', 'group-class-sync-test', 'unknown', ['solo-class']]) {
      expect(getScheduleBooking(true, query)).toBe(consultationBooking)
    }
  })

  it('links programs to matching bookings and keeps unconfigured programs on consultation', () => {
    expect(getProgramBookings('Level-Based Group Classes').map(({ slug }) => slug)).toEqual(['level-class'])
    expect(getProgramBookings('Competition Solo & Duet').map(({ slug }) => slug)).toEqual(['solo-class-30min', 'solo-class', 'duet-class'])
    for (const title of ['Technique & Fundamentals', 'Seasonal Summer Camps', 'New program']) {
      expect(getProgramBookings(title)).toEqual([consultationBooking])
    }
  })

  it('recognizes all official classes for signed webhook processing with older environment settings', () => {
    for (const option of paidClassBookings) {
      expect(isAllowedCalEventType(option.slug, 'trial-class-consultation,level-class,duet-class')).toBe(true)
    }
    expect(isAllowedCalEventType('unknown')).toBe(false)
  })
})
