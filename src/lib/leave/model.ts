export const LEAVE_TIME_ZONE = 'America/New_York'
export const LEAVE_ALLOWANCE = 2

export type LeavePeriod = { start: string; end: string; nextReset: string }
export type LeaveTimes = { first_leave_at: string | null; second_leave_at: string | null }
export type LeaveData = LeaveTimes & { unavailable?: boolean }

export function leavePeriod(instant: string | Date): LeavePeriod {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: LEAVE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant))
  const year = Number(date.slice(0, 4))
  return date.slice(5, 7) < '06'
    ? { start: `${year}-01-01`, end: `${year}-05-31`, nextReset: `${year}-06-01` }
    : { start: `${year}-06-01`, end: `${year}-12-31`, nextReset: `${year + 1}-01-01` }
}

export function currentLeaveTimes(times: LeaveTimes, now: string | Date) {
  const period = leavePeriod(now)
  return [times.first_leave_at, times.second_leave_at].filter((value): value is string =>
    Boolean(
      value &&
      Number.isFinite(Date.parse(value)) &&
      Date.parse(value) <= new Date(now).getTime() &&
      leavePeriod(value).start === period.start,
    ),
  )
}

export function leaveDateLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: LEAVE_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value))
}

export function leavePeriodLabel(period: Pick<LeavePeriod, 'start' | 'end'>) {
  const format = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${value}T12:00:00Z`))
  return `${format(period.start)} – ${format(period.end)}`
}

export function leaveReasonError(value: string) {
  return !value.trim() || value.trim().length > 1000
    ? 'Enter your leave request (up to 1,000 characters).'
    : null
}
