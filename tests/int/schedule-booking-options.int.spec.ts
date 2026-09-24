import { describe, expect, it } from 'vitest'
import { consultationBooking, getProgramBookings, getScheduleBooking, paidClassBookings, scheduleBookings } from '@/lib/cal/booking-options'
import { isAllowedCalEventType } from '@/lib/cal/booking-sync'

describe('Schedule booking access', () => {
  it('always selects free consultation, including old paid query parameters', () => {
    for (const option of paidClassBookings) {
      expect(getScheduleBooking(option.slug)).toBe(consultationBooking)
    }
    expect(getScheduleBooking()).toBe(consultationBooking)
  })

  it('offers only free trial for all visitors and signed-in students', () => {
    expect(scheduleBookings).toEqual([consultationBooking])
    for (const option of scheduleBookings) {
      expect(getScheduleBooking(option.slug)).toBe(option)
    }
    for (const query of [undefined, 'trial-class-consultation', 'group-class-sync-test', 'unknown', ['solo-class']]) {
      expect(getScheduleBooking(query)).toBe(consultationBooking)
    }
  })

  it('links programs only to free trial booking', () => {
    expect(getProgramBookings()).toEqual([consultationBooking])
  })

  it('recognizes all official classes for signed webhook processing with older environment settings', () => {
    for (const option of paidClassBookings) {
      expect(isAllowedCalEventType(option.slug, 'trial-class-consultation,level-class,duet-class')).toBe(true)
    }
    expect(isAllowedCalEventType('unknown')).toBe(false)
  })
})
