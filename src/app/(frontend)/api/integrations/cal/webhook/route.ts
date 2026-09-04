import {
  isAllowedCalEventType,
  normalizeEmail,
  parseCalWebhook,
  verifyCalWebhookSignature,
} from '@/lib/cal/booking-sync'
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type ExistingScheduleEntry = {
  id: string
  user_profile_id: string | null
  match_status: 'linked' | 'unmatched' | 'needs_review'
  booking_intent_id: string | null
  attendee_name: string | null
  attendee_email: string | null
  cal_event_type_id: number | null
  cal_event_type_slug: string | null
  rescheduled_from_uid: string | null
  matched_at: string | null
  title: string
  starts_at: string
  ends_at: string
  timezone: string
  location: string | null
}

type BookingIntent = {
  id: string
  user_profile_id: string
  expected_email: string
  expires_at: string
  consumed_at: string | null
  cal_booking_uid: string | null
}

type ProfileIdentity = {
  id: string
  email: string
}

const scheduleEntrySelect =
  'id, user_profile_id, match_status, booking_intent_id, attendee_name, attendee_email, cal_event_type_id, cal_event_type_slug, rescheduled_from_uid, matched_at, title, starts_at, ends_at, timezone, location'

export async function POST(request: Request) {
  const secret = process.env.CAL_WEBHOOK_SECRET?.trim()
  if (!secret || !isSupabaseAdminConfigured()) {
    return Response.json({ error: 'Cal.com synchronization is not configured.' }, { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-cal-signature-256') ?? ''
  if (!verifyCalWebhookSignature(rawBody, signature, secret)) {
    return Response.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  const booking = parseCalWebhook(rawBody)
  if (!booking) {
    return Response.json({ error: 'Unsupported webhook payload.' }, { status: 400 })
  }
  if (!isAllowedCalEventType(booking.eventTypeSlug, process.env.CAL_ALLOWED_EVENT_TYPE_SLUGS)) {
    return Response.json({ status: 'ignored' }, { status: 202 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: currentData, error: existingError } = await supabase
    .from('app_schedule_entries')
    .select(scheduleEntrySelect)
    .eq('cal_booking_uid', booking.uid)
    .maybeSingle<ExistingScheduleEntry>()

  if (existingError) {
    return Response.json({ error: 'Could not inspect the existing booking.' }, { status: 500 })
  }

  let existingData = currentData
  if (!existingData && booking.rescheduledFromUid) {
    const { data: previousData, error: previousError } = await supabase
      .from('app_schedule_entries')
      .select(scheduleEntrySelect)
      .eq('cal_booking_uid', booking.rescheduledFromUid)
      .maybeSingle<ExistingScheduleEntry>()

    if (previousError) {
      return Response.json({ error: 'Could not inspect the previous booking.' }, { status: 500 })
    }
    existingData = previousData
  }

  const attendeeEmail = normalizeEmail(booking.attendeeEmail)
  let userProfileId = existingData?.match_status === 'linked' ? existingData.user_profile_id : null
  let bookingIntentId =
    existingData?.match_status === 'linked' ? existingData.booking_intent_id : null

  if (!userProfileId) {
    if (!booking.bookingIntentId || !attendeeEmail) {
      return Response.json({ status: 'ignored', reason: 'account_required' }, { status: 202 })
    }

    const { data: intent } = await supabase
      .from('app_booking_intents')
      .select('id, user_profile_id, expected_email, expires_at, consumed_at, cal_booking_uid')
      .eq('id', booking.bookingIntentId)
      .maybeSingle<BookingIntent>()

    const intentEmail = normalizeEmail(intent?.expected_email)
    const notExpired = Boolean(intent && Date.parse(intent.expires_at) > Date.now())
    const availableForBooking = Boolean(
      intent &&
      (!intent.cal_booking_uid ||
        intent.cal_booking_uid === booking.uid ||
        intent.cal_booking_uid === booking.rescheduledFromUid),
    )

    if (!intent || intentEmail !== attendeeEmail || !notExpired || !availableForBooking) {
      return Response.json(
        { status: 'ignored', reason: 'invalid_account_context' },
        { status: 202 },
      )
    }

    bookingIntentId = intent.id
    userProfileId = intent.user_profile_id
  }

  if (attendeeEmail) {
    const { data: linkedProfile } = await supabase
      .from('app_user_profiles')
      .select('id, email')
      .eq('id', userProfileId)
      .maybeSingle<ProfileIdentity>()

    if (normalizeEmail(linkedProfile?.email) !== attendeeEmail) {
      return Response.json({ status: 'ignored', reason: 'email_mismatch' }, { status: 202 })
    }
  }

  const title = booking.title ?? existingData?.title
  const startsAt = booking.startsAt ?? existingData?.starts_at
  const endsAt = booking.endsAt ?? existingData?.ends_at
  if (!title || !startsAt || !endsAt) {
    return Response.json({ error: 'The booking is missing schedule details.' }, { status: 422 })
  }

  const scheduleEntry = {
    user_profile_id: userProfileId,
    candidate_user_profile_id: null,
    booking_intent_id: bookingIntentId,
    entry_type: booking.entryType,
    title,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: booking.timezone || existingData?.timezone || 'America/New_York',
    location: booking.location ?? existingData?.location ?? null,
    status: booking.status,
    cal_booking_uid: booking.uid,
    source: 'cal_com',
    match_status: 'linked',
    attendee_name: booking.attendeeName ?? existingData?.attendee_name ?? null,
    attendee_email: attendeeEmail ?? existingData?.attendee_email ?? null,
    cal_event_type_id: booking.eventTypeId ?? existingData?.cal_event_type_id ?? null,
    cal_event_type_slug: booking.eventTypeSlug ?? existingData?.cal_event_type_slug ?? null,
    rescheduled_from_uid: booking.rescheduledFromUid ?? existingData?.rescheduled_from_uid ?? null,
    last_synced_at: new Date().toISOString(),
    matched_at: existingData?.matched_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { error: upsertError } = existingData
    ? await supabase.from('app_schedule_entries').update(scheduleEntry).eq('id', existingData.id)
    : await supabase
        .from('app_schedule_entries')
        .upsert(scheduleEntry, { onConflict: 'cal_booking_uid' })

  if (upsertError) {
    return Response.json({ error: 'Could not synchronize the booking.' }, { status: 500 })
  }

  if (scheduleEntry.booking_intent_id) {
    const { error: intentUpdateError } = await supabase
      .from('app_booking_intents')
      .update({ consumed_at: new Date().toISOString(), cal_booking_uid: booking.uid })
      .eq('id', scheduleEntry.booking_intent_id)

    if (intentUpdateError) {
      return Response.json(
        { error: 'The booking synchronized but its intent did not.' },
        { status: 500 },
      )
    }
  }

  return Response.json({ status: 'synchronized', matchStatus: 'linked' })
}
