export type AccountScheduleEntry = {
  id: string
  entryType: 'class' | 'consultation' | 'private_lesson' | 'makeup'
  title: string
  startsAt: string
  endsAt: string
  timezone: string
  location: string | null
  status: 'scheduled' | 'changed' | 'cancelled' | 'completed'
  source: 'academy' | 'cal_com'
}

type StoredScheduleEntry = {
  id: string
  entry_type: AccountScheduleEntry['entryType']
  title: string
  starts_at: string
  ends_at: string
  timezone: string
  location: string | null
  status: AccountScheduleEntry['status']
  source: AccountScheduleEntry['source']
}

export function mapStoredScheduleEntry(entry: StoredScheduleEntry): AccountScheduleEntry {
  return {
    id: entry.id,
    entryType: entry.entry_type,
    title: entry.title,
    startsAt: entry.starts_at,
    endsAt: entry.ends_at,
    timezone: entry.timezone,
    location: entry.location,
    status: entry.status,
    source: entry.source,
  }
}

function getFormatter(timezone: string, options: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timezone })
  } catch {
    return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'America/New_York' })
  }
}

export function formatScheduleEntry(entry: AccountScheduleEntry) {
  const start = new Date(entry.startsAt)
  const end = new Date(entry.endsAt)
  const month = getFormatter(entry.timezone, { month: 'short' }).format(start)
  const day = getFormatter(entry.timezone, { day: 'numeric' }).format(start)
  const date = getFormatter(entry.timezone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(start)
  const startTime = getFormatter(entry.timezone, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(start)
  const endTime = getFormatter(entry.timezone, {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(end)

  return {
    month,
    day,
    date,
    time: `${startTime}–${endTime}`,
  }
}

export function getScheduleSourceLabel(entry: AccountScheduleEntry) {
  return entry.source === 'cal_com' ? 'Cal.com' : 'Academy'
}

export function getScheduleStatusLabel(entry: AccountScheduleEntry) {
  return entry.status.replace('_', ' ').replace(/^./, (value) => value.toUpperCase())
}
