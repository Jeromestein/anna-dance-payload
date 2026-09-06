import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, SetStepNav } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { isAdministratorUser } from '@/access/staff'
import {
  type AccountScheduleEntry,
  formatScheduleEntry,
  getScheduleStatusLabel,
  mapStoredScheduleEntry,
} from '@/lib/account/schedule'
import { type CalAppointmentSession, groupCalAppointments } from '@/lib/cal/appointment-sessions'
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin'

type Appointment = {
  id: string
  user_profile_id: string
  attendee_name: string | null
  attendee_email: string | null
  cal_booking_uid: string | null
  cal_session_key: string | null
  seat_capacity: number | null
  entry_type: AccountScheduleEntry['entryType']
  title: string
  starts_at: string
  ends_at: string
  timezone: string
  location: string | null
  status: AccountScheduleEntry['status']
  source: AccountScheduleEntry['source']
}

type StudentOption = {
  id: string
  name: string
}

function selectSessionAppointments(
  sessions: CalAppointmentSession<Appointment>[],
  predicate: (appointment: Appointment) => boolean,
) {
  const selectedSessions: CalAppointmentSession<Appointment>[] = []

  for (const session of sessions) {
    const selectedAppointments = session.appointments.filter(predicate)
    if (selectedAppointments.length === 0) continue

    selectedSessions.push({
      ...session,
      appointments: selectedAppointments,
      representative: selectedAppointments[0],
      bookedSeats: selectedAppointments.filter((appointment) => appointment.status !== 'cancelled')
        .length,
    })
  }

  return selectedSessions
}

function groupSessionsByDate(sessions: CalAppointmentSession<Appointment>[]) {
  const sessionsByDate = new Map<string, CalAppointmentSession<Appointment>[]>()

  for (const session of sessions) {
    const dateKey = getZonedDateKey(
      session.representative.starts_at,
      session.representative.timezone,
    )
    const existing = sessionsByDate.get(dateKey)
    if (existing) existing.push(session)
    else sessionsByDate.set(dateKey, [session])
  }

  return sessionsByDate
}

const adminCalendarTimeZone = 'America/Los_Angeles'
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getZonedDateKey(value: string | Date, timeZone = adminCalendarTimeZone) {
  const date = typeof value === 'string' ? new Date(value) : value
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return year && month && day ? `${year}-${month}-${day}` : ''
}

function normalizeMonthKey(value: string | undefined, fallback: string) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : fallback
}

function shiftMonth(monthKey: string, amount: number) {
  const [year, month] = monthKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
}

function getMonthDetails(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const firstDay = new Date(Date.UTC(year, month - 1, 1))

  return {
    year,
    month,
    leadingDays: firstDay.getUTCDay(),
    dayCount: new Date(Date.UTC(year, month, 0)).getUTCDate(),
    label: new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(firstDay),
  }
}

function formatSelectedDate(dateKey: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateKey}T12:00:00.000Z`))
}

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function requireAdministrator(props: AdminViewServerProps) {
  const user = props.initPageResult.req.user
  if (!user) redirect('/admin/login?redirect=%2Fadmin%2Fappointments')
  if (!isAdministratorUser(user)) redirect('/admin?error=Administrator+access+is+required.')
}

function AppointmentAdminTemplate({
  children,
  props,
}: {
  children: React.ReactNode
  props: AdminViewServerProps
}) {
  return (
    <DefaultTemplate
      i18n={props.initPageResult.req.i18n}
      locale={props.initPageResult.locale}
      params={props.params}
      payload={props.initPageResult.req.payload}
      permissions={props.initPageResult.permissions}
      searchParams={props.searchParams}
      user={props.initPageResult.req.user || undefined}
      visibleEntities={props.initPageResult.visibleEntities}
    >
      <Gutter>{children}</Gutter>
    </DefaultTemplate>
  )
}

export async function AppointmentAdminView(props: AdminViewServerProps) {
  requireAdministrator(props)
  const routeError = getSearchParam(props.searchParams?.error)
  const message = getSearchParam(props.searchParams?.message)
  const todayKey = getZonedDateKey(new Date())
  const visibleMonth = normalizeMonthKey(
    getSearchParam(props.searchParams?.month),
    todayKey.slice(0, 7),
  )

  if (!isSupabaseAdminConfigured()) {
    return (
      <AppointmentAdminTemplate props={props}>
        <div className="appointment-admin">
          <h1>Appointments</h1>
          <p className="student-admin__alert student-admin__alert--error" role="alert">
            Appointment management is not configured. Add the server-only Supabase configuration and
            restart the app.
          </p>
        </div>
      </AppointmentAdminTemplate>
    )
  }

  const supabase = createSupabaseAdminClient()
  const [appointmentsResult, studentsResult] = await Promise.all([
    supabase
      .from('app_schedule_entries')
      .select(
        'id, user_profile_id, attendee_name, attendee_email, cal_booking_uid, cal_session_key, seat_capacity, entry_type, title, starts_at, ends_at, timezone, location, status, source',
      )
      .eq('source', 'cal_com')
      .eq('match_status', 'linked')
      .not('user_profile_id', 'is', null)
      .order('starts_at', { ascending: false })
      .limit(100),
    supabase.from('app_user_profiles').select('id, name').order('name').limit(500),
  ])

  const appointments = (appointmentsResult.data ?? []) as Appointment[]
  const students = (studentsResult.data ?? []) as StudentOption[]
  const studentsById = new Map(students.map((student) => [student.id, student]))
  const appointmentSessions = groupCalAppointments(appointments).sort(
    (first, second) =>
      Date.parse(first.representative.starts_at) - Date.parse(second.representative.starts_at),
  )
  const activeSessions = selectSessionAppointments(
    appointmentSessions,
    (appointment) => appointment.status !== 'cancelled',
  )
  const cancelledSessions = selectSessionAppointments(
    appointmentSessions,
    (appointment) => appointment.status === 'cancelled',
  )
  const sessionsByDate = groupSessionsByDate(activeSessions)
  const cancelledSessionsByDate = groupSessionsByDate(cancelledSessions)
  const monthSessionDates = Array.from(sessionsByDate.keys())
    .filter((dateKey) => dateKey.startsWith(`${visibleMonth}-`))
    .sort()
  const monthCancelledDates = Array.from(cancelledSessionsByDate.keys())
    .filter((dateKey) => dateKey.startsWith(`${visibleMonth}-`))
    .sort()
  const requestedDate = getSearchParam(props.searchParams?.date)
  const selectedDate =
    requestedDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) &&
    requestedDate.startsWith(visibleMonth)
      ? requestedDate
      : monthSessionDates.find((dateKey) => dateKey >= todayKey) ||
        monthSessionDates[0] ||
        monthCancelledDates.find((dateKey) => dateKey >= todayKey) ||
        monthCancelledDates[0] ||
        (todayKey.startsWith(visibleMonth) ? todayKey : `${visibleMonth}-01`)
  const selectedSessions = sessionsByDate.get(selectedDate) ?? []
  const selectedCancelledSessions = cancelledSessionsByDate.get(selectedDate) ?? []
  const selectedBookedSeats = selectedSessions.reduce(
    (total, session) => total + session.bookedSeats,
    0,
  )
  const selectedCancelledCount = selectedCancelledSessions.reduce(
    (total, session) => total + session.appointments.length,
    0,
  )
  const monthDetails = getMonthDetails(visibleMonth)
  const previousMonth = shiftMonth(visibleMonth, -1)
  const nextMonth = shiftMonth(visibleMonth, 1)
  const loadError = appointmentsResult.error || studentsResult.error

  return (
    <AppointmentAdminTemplate props={props}>
      <div className="appointment-admin">
        <SetStepNav nav={[{ label: 'Appointments' }]} />
        <header className="student-admin__header">
          <h1>Appointments</h1>
          <p>Review account-linked class appointments synchronized from Cal.com.</p>
        </header>

        {routeError && (
          <p className="student-admin__alert student-admin__alert--error" role="alert">
            {routeError}
          </p>
        )}
        {message && (
          <p className="student-admin__alert student-admin__alert--success" role="status">
            {message}
          </p>
        )}
        {loadError && (
          <p className="student-admin__alert student-admin__alert--error" role="alert">
            Appointments could not be loaded. Confirm that the Cal.com database migration has been
            applied.
          </p>
        )}

        {!loadError && appointments.length === 0 ? (
          <div className="appointment-admin__empty">
            <h2>No synchronized appointments yet</h2>
            <p>Bookings made by signed-in Students will appear here after secure confirmation.</p>
          </div>
        ) : (
          <div className="appointment-admin__calendar-layout">
            <section
              className="appointment-admin__calendar"
              aria-label={`${monthDetails.label} calendar`}
            >
              <header className="appointment-admin__calendar-header">
                <div>
                  <span className="appointment-admin__eyebrow">Schedule overview</span>
                  <h2>{monthDetails.label}</h2>
                </div>
                <nav aria-label="Calendar navigation">
                  <Link
                    href={`/admin/appointments?month=${previousMonth}`}
                    aria-label="Previous month"
                  >
                    ←
                  </Link>
                  <Link href={`/admin/appointments?month=${todayKey.slice(0, 7)}&date=${todayKey}`}>
                    Today
                  </Link>
                  <Link href={`/admin/appointments?month=${nextMonth}`} aria-label="Next month">
                    →
                  </Link>
                </nav>
              </header>

              <div className="appointment-admin__weekdays" aria-hidden="true">
                {weekdayLabels.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>
              <div className="appointment-admin__days">
                {Array.from({ length: monthDetails.leadingDays }, (_, index) => (
                  <span className="appointment-admin__day--outside" key={`leading-${index}`} />
                ))}
                {Array.from({ length: monthDetails.dayCount }, (_, index) => {
                  const day = index + 1
                  const dateKey = `${visibleMonth}-${String(day).padStart(2, '0')}`
                  const daySessions = sessionsByDate.get(dateKey) ?? []
                  const bookedSeats = daySessions.reduce(
                    (total, session) => total + session.bookedSeats,
                    0,
                  )
                  const isSelected = dateKey === selectedDate
                  const isToday = dateKey === todayKey

                  return (
                    <Link
                      className={`appointment-admin__day${isSelected ? ' appointment-admin__day--selected' : ''}${isToday ? ' appointment-admin__day--today' : ''}${daySessions.length ? ' appointment-admin__day--has-events' : ''}`}
                      href={`/admin/appointments?month=${visibleMonth}&date=${dateKey}`}
                      key={dateKey}
                      aria-current={isSelected ? 'date' : undefined}
                      aria-label={`${formatSelectedDate(dateKey)}, ${daySessions.length} active ${daySessions.length === 1 ? 'appointment' : 'appointments'}, ${bookedSeats} ${bookedSeats === 1 ? 'student' : 'students'} booked`}
                    >
                      <span>{day}</span>
                      {daySessions.length > 0 && (
                        <strong>
                          {daySessions.length}{' '}
                          {daySessions.length === 1 ? 'appointment' : 'appointments'}
                        </strong>
                      )}
                      {daySessions.length > 0 && <small>{bookedSeats} booked</small>}
                    </Link>
                  )
                })}
              </div>
              <footer className="appointment-admin__calendar-legend">
                <span>
                  <i /> Appointment day
                </span>
                <span>
                  <i /> Selected day
                </span>
              </footer>
            </section>

            <aside className="appointment-admin__agenda" aria-label="Selected day appointments">
              <header>
                <span className="appointment-admin__eyebrow">Selected day</span>
                <h2>{formatSelectedDate(selectedDate)}</h2>
                <p>
                  {selectedSessions.length
                    ? `${selectedSessions.length} active ${selectedSessions.length === 1 ? 'appointment' : 'appointments'} · ${selectedBookedSeats} ${selectedBookedSeats === 1 ? 'student' : 'students'} booked`
                    : 'No active appointments'}
                </p>
              </header>

              {selectedSessions.length === 0 ? (
                <div className="appointment-admin__agenda-empty">
                  <strong>
                    {selectedCancelledCount ? 'No active appointments' : 'This day is open'}
                  </strong>
                  <p>
                    {selectedCancelledCount
                      ? 'Cancelled appointment history is available below.'
                      : 'Select a highlighted date to review its appointments and attendees.'}
                  </p>
                </div>
              ) : (
                <div className="appointment-admin__agenda-list">
                  {selectedSessions.map((session) => {
                    const sessionEntry = mapStoredScheduleEntry(session.representative)
                    const display = formatScheduleEntry(sessionEntry)
                    const seatSummary = session.capacity
                      ? `${session.bookedSeats} / ${session.capacity} seats`
                      : `${session.bookedSeats} booked`

                    return (
                      <section className="appointment-admin__agenda-session" key={session.key}>
                        <header>
                          <div>
                            <span>{display.time}</span>
                            <h3>{session.representative.title}</h3>
                            {session.representative.location && (
                              <small>{session.representative.location}</small>
                            )}
                          </div>
                          <strong className="appointment-admin__seat-count">{seatSummary}</strong>
                        </header>
                        <div className="appointment-admin__attendees">
                          {session.appointments.map((appointment) => {
                            const scheduleEntry = mapStoredScheduleEntry(appointment)
                            const linkedStudent = studentsById.get(appointment.user_profile_id)

                            return (
                              <article key={appointment.id}>
                                <div>
                                  <strong>{appointment.attendee_name || 'Attendee'}</strong>
                                  <span>{appointment.attendee_email || 'Email not provided'}</span>
                                </div>
                                <div>
                                  <small>{getScheduleStatusLabel(scheduleEntry)}</small>
                                  {linkedStudent ? (
                                    <Link href={`/admin/students/${linkedStudent.id}`}>
                                      View student
                                    </Link>
                                  ) : (
                                    <span>Account unavailable</span>
                                  )}
                                </div>
                              </article>
                            )
                          })}
                        </div>
                      </section>
                    )
                  })}
                </div>
              )}

              {selectedCancelledCount > 0 && (
                <details className="appointment-admin__cancelled">
                  <summary>
                    <span>Cancelled ({selectedCancelledCount})</span>
                    <small>History</small>
                  </summary>
                  <div className="appointment-admin__cancelled-list">
                    {selectedCancelledSessions.map((session) => {
                      const sessionEntry = mapStoredScheduleEntry(session.representative)
                      const display = formatScheduleEntry(sessionEntry)

                      return (
                        <section className="appointment-admin__cancelled-session" key={session.key}>
                          <header>
                            <span>{display.time}</span>
                            <h3>{session.representative.title}</h3>
                          </header>
                          <div className="appointment-admin__attendees">
                            {session.appointments.map((appointment) => {
                              const linkedStudent = studentsById.get(appointment.user_profile_id)

                              return (
                                <article key={appointment.id}>
                                  <div>
                                    <strong>{appointment.attendee_name || 'Attendee'}</strong>
                                    <span>
                                      {appointment.attendee_email || 'Email not provided'}
                                    </span>
                                  </div>
                                  <div>
                                    <small>Cancelled</small>
                                    {linkedStudent ? (
                                      <Link href={`/admin/students/${linkedStudent.id}`}>
                                        View student
                                      </Link>
                                    ) : (
                                      <span>Account unavailable</span>
                                    )}
                                  </div>
                                </article>
                              )
                            })}
                          </div>
                        </section>
                      )
                    })}
                  </div>
                </details>
              )}
            </aside>
          </div>
        )}
      </div>
    </AppointmentAdminTemplate>
  )
}
