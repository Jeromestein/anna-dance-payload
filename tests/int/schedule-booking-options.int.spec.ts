import { describe, expect, it } from 'vitest'
import { consultationBooking, getScheduleBooking, paidClassBookings } from '@/lib/cal/booking-options'
import { isAllowedCalEventType } from '@/lib/cal/booking-sync'

describe('Schedule booking access', () => {
  it('always selects free consultation for visitors, including paid query parameters', () => {
    for (const option of paidClassBookings) {
      expect(getScheduleBooking(false, option.slug)).toBe(consultationBooking)
    }
    expect(getScheduleBooking(false)).toBe(consultationBooking)
  })

  it('only selects official paid classes for authenticated students', () => {
    for (const option of paidClassBookings) {
      expect(getScheduleBooking(true, option.slug)).toBe(option)
    }
    for (const query of ['group-class-sync-test', 'trial-class-consultation', 'unknown', ['solo-class']]) {
      expect(getScheduleBooking(true, query)).toBe(paidClassBookings[0])
    }
  })

  it('recognizes all official classes for signed webhook processing with older environment settings', () => {
    for (const option of paidClassBookings) {
      expect(isAllowedCalEventType(option.slug, 'trial-class-consultation,level-class,duet-class')).toBe(true)
    }
    expect(isAllowedCalEventType('unknown')).toBe(false)
  })
})
