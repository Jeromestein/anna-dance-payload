import { describe, expect, it } from 'vitest'
import { leavePeriod, leaveReasonError } from '@/lib/leave/model'

describe('Student leave reset periods in New York', () => {
  it('resets on January 1 at local midnight', () => {
    expect(leavePeriod('2027-01-01T04:59:59Z').start).toBe('2026-06-01')
    expect(leavePeriod('2027-01-01T05:00:00Z')).toEqual({
      start: '2027-01-01',
      end: '2027-05-31',
      nextReset: '2027-06-01',
    })
  })
  it('resets on June 1 at local midnight using daylight saving time', () => {
    expect(leavePeriod('2027-06-01T03:59:59Z').start).toBe('2027-01-01')
    expect(leavePeriod('2027-06-01T04:00:00Z')).toEqual({
      start: '2027-06-01',
      end: '2027-12-31',
      nextReset: '2028-01-01',
    })
  })
  it('does not reset in July or carry a previous cycle into a new year', () => {
    expect(leavePeriod('2027-07-01T12:00:00Z').start).toBe('2027-06-01')
    expect(leavePeriod('2028-02-29T12:00:00Z').start).toBe('2028-01-01')
  })
  it('rejects blank or excessive reasons', () => {
    expect(leaveReasonError(' \n ')).toBeTruthy()
    expect(leaveReasonError('a'.repeat(1001))).toBeTruthy()
    expect(leaveReasonError('Family appointment')).toBeNull()
  })
})
