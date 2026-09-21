import { newYorkInstant } from './course-credits'
import type { AccountScheduleEntry } from './schedule'

export const courseTimeZone = 'America/New_York'

export function courseDateKey(value: string | Date) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: courseTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export function courseDateLabel(key: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${key}T12:00:00Z`))
}

export function courseTimeLabel(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: courseTimeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
}

export function courseTimeRange(start: string, end: string) {
  const nextDay = courseDateKey(start) !== courseDateKey(end)
  return `${courseTimeLabel(start)}–${nextDay ? `${courseDateLabel(courseDateKey(end))} · ` : ''}${courseTimeLabel(end)}`
}

export function planLessonSlot(
  date: string,
  time: string,
  minutes: number,
  entries: AccountScheduleEntry[],
  excludeId?: string,
) {
  const start = newYorkInstant(`${date}T${time}`)
  const end = new Date(Date.parse(start) + minutes * 60000).toISOString()
  const conflict = entries.find(
    (entry) =>
      entry.id !== excludeId &&
      ['scheduled', 'changed'].includes(entry.status) &&
      Date.parse(entry.startsAt) < Date.parse(end) &&
      Date.parse(entry.endsAt) > Date.parse(start),
  )
  return { start, end, conflict }
}

export function courseMonth(month: string, offset = 0) {
  const [year, number] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, number - 1 + offset, 1))
  return {
    key: first.toISOString().slice(0, 7),
    label: new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'long',
      year: 'numeric',
    }).format(first),
    leading: first.getUTCDay(),
    days: new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate(),
  }
}
