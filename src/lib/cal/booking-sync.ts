import { createHmac, timingSafeEqual } from 'node:crypto'

export const CAL_BOOKING_EVENTS = [
  'BOOKING_CREATED',
  'BOOKING_RESCHEDULED',
  'BOOKING_CANCELLED',
  'BOOKING_CONFIRMED',
  'BOOKING_REJECTED',
  'BOOKING_COMPLETED',
] as const

export type CalBookingEvent = (typeof CAL_BOOKING_EVENTS)[number]
export type ScheduleEntryStatus = 'scheduled' | 'changed' | 'cancelled' | 'completed'
export type ScheduleEntryType = 'consultation' | 'private_lesson' | 'makeup'

export type NormalizedCalBooking = {
  triggerEvent: CalBookingEvent
  uid: string
  title: string | null
  startsAt: string | null
  endsAt: string | null
  timezone: string
  location: string | null
  status: ScheduleEntryStatus
  entryType: ScheduleEntryType
  attendeeName: string | null
  attendeeEmail: string | null
  eventTypeId: number | null
  eventTypeSlug: string | null
  bookingIntentId: string | null
  rescheduledFromUid: string | null
}

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readString(record: UnknownRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function readNumber(record: UnknownRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  }
  return null
}

function readResponseValue(payload: UnknownRecord, key: string) {
  const responses = isRecord(payload.responses) ? payload.responses : null
  const response = responses && isRecord(responses[key]) ? responses[key] : null
  const value = response?.value
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readLocation(payload: UnknownRecord) {
  const location = payload.location
  if (typeof location === 'string' && location.trim()) return location.trim()
  if (!isRecord(location)) return null
  return readString(location, 'optionValue', 'value', 'label')
}

function getStatus(triggerEvent: CalBookingEvent): ScheduleEntryStatus {
  if (triggerEvent === 'BOOKING_CANCELLED' || triggerEvent === 'BOOKING_REJECTED') {
    return 'cancelled'
  }
  if (triggerEvent === 'BOOKING_RESCHEDULED') return 'changed'
  if (triggerEvent === 'BOOKING_COMPLETED') return 'completed'
  return 'scheduled'
}

function getEntryType(slug: string | null): ScheduleEntryType {
  const value = slug?.toLowerCase() ?? ''
  if (value.includes('makeup') || value.includes('make-up')) return 'makeup'
  if (value.includes('private')) return 'private_lesson'
  return 'consultation'
}

export function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? ''
  return email && email.length <= 254 ? email : null
}

export function verifyCalWebhookSignature(rawBody: string, signature: string, secret: string) {
  const received = signature.trim().replace(/^sha256=/i, '')
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')

  if (!/^[a-f0-9]{64}$/i.test(received)) return false

  return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expected, 'hex'))
}

export function parseCalWebhook(rawBody: string): NormalizedCalBooking | null {
  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return null
  }

  if (!isRecord(event)) return null

  const triggerEvent = readString(event, 'triggerEvent')
  if (!CAL_BOOKING_EVENTS.includes(triggerEvent as CalBookingEvent)) return null

  const payload = isRecord(event.payload) ? event.payload : event
  const attendees = Array.isArray(payload.attendees) ? payload.attendees : []
  const primaryAttendee = attendees.find(isRecord) ?? null
  const metadata = isRecord(payload.metadata) ? payload.metadata : null
  const uid = readString(payload, 'uid', 'bookingUid')

  if (!uid) return null

  const attendeeEmail = normalizeEmail(
    (primaryAttendee && readString(primaryAttendee, 'email')) ??
      readResponseValue(payload, 'email') ??
      readString(payload, 'email'),
  )
  const attendeeName =
    (primaryAttendee && readString(primaryAttendee, 'name')) ??
    readResponseValue(payload, 'name') ??
    readString(payload, 'attendeeName')
  const eventTypeSlug = readString(payload, 'type', 'eventTypeSlug')

  return {
    triggerEvent: triggerEvent as CalBookingEvent,
    uid,
    title: readString(payload, 'title'),
    startsAt: readString(payload, 'startTime', 'start'),
    endsAt: readString(payload, 'endTime', 'end'),
    timezone:
      (primaryAttendee && readString(primaryAttendee, 'timeZone', 'timezone')) ??
      readString(payload, 'timeZone', 'timezone') ??
      'America/New_York',
    location: readLocation(payload),
    status: getStatus(triggerEvent as CalBookingEvent),
    entryType: getEntryType(eventTypeSlug),
    attendeeName,
    attendeeEmail,
    eventTypeId: readNumber(payload, 'eventTypeId'),
    eventTypeSlug,
    bookingIntentId:
      (metadata && readString(metadata, 'bookingIntentId', 'booking_intent_id')) ?? null,
    rescheduledFromUid:
      triggerEvent === 'BOOKING_RESCHEDULED'
        ? readString(payload, 'rescheduledFromUid', 'rescheduleUid')
        : readString(payload, 'rescheduledFromUid'),
  }
}

export function isAllowedCalEventType(slug: string | null, configuredSlugs?: string) {
  const allowed = (configuredSlugs || 'trial-class-consultation')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  return Boolean(slug && allowed.includes(slug.toLowerCase()))
}
