export type CourseBalance = {
  request_id?: string
  item_id: string
  payment_id: string
  bill_number: string
  description: string
  course_key: string
  credit_count: number
  lesson_duration_minutes: number
  reserved: number
  completed: number
  available: number
  allocatable: boolean
  bill_status: string
}
export type ManagedLesson = {
  id: string
  payment_item_id: string
  starts_at: string
  ends_at: string
  location: string | null
  status: string
  revision: number
  source: string
}
export type CourseCreditData = {
  balances: CourseBalance[]
  lessons: ManagedLesson[]
  unavailable: boolean
  test?: boolean
}

// New York wall time is explicit: reject both missing and ambiguous DST times.
export function newYorkInstant(local: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))
    throw new Error('Enter a valid lesson date and time.')
  const base = Date.parse(`${local}:00Z`)
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const candidates = [4, 5]
    .map((offset) => new Date(base + offset * 3600000))
    .filter(
      (date) =>
        Number.isFinite(date.getTime()) && formatter.format(date).replace(' ', 'T') === local,
    )
  if (candidates.length !== 1)
    throw new Error(
      'This New York time is missing or ambiguous because of daylight saving time. Choose another time.',
    )
  return candidates[0].toISOString()
}
export function lessonDates(local: string, weeks: number, skipped: string) {
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 100)
    throw new Error('Enter 1–100 weekly dates.')
  newYorkInstant(local)
  const skip = new Set(skipped.split(/[\s,]+/).filter(Boolean))
  if ([...skip].some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date)))
    throw new Error('Use YYYY-MM-DD for skipped dates.')
  const result: { local: string; instant: string }[] = []
  const validDates = new Set<string>()
  for (let index = 0; index < weeks; index++) {
    const day = new Date(Date.parse(`${local.slice(0, 10)}T12:00:00Z`) + index * 7 * 86400000)
      .toISOString()
      .slice(0, 10)
    validDates.add(day)
    if (skip.has(day)) continue
    const value = `${day}T${local.slice(11)}`
    result.push({ local: value, instant: newYorkInstant(value) })
  }
  if ([...skip].some((date) => !validDates.has(date)))
    throw new Error('A skipped date is outside this weekly series.')
  if (!result.length) throw new Error('Keep at least one lesson date.')
  return result
}
