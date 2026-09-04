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
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin'

type Appointment = {
  id: string
  user_profile_id: string
  attendee_name: string | null
  attendee_email: string | null
  cal_booking_uid: string | null
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
        'id, user_profile_id, attendee_name, attendee_email, cal_booking_uid, entry_type, title, starts_at, ends_at, timezone, location, status, source',
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
          <div className="table appointment-admin__table-wrap">
            <table className="appointment-admin__table">
              <thead>
                <tr>
                  <th scope="col">Appointment</th>
                  <th scope="col">Attendee</th>
                  <th scope="col">Status</th>
                  <th scope="col">Student account</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appointment) => {
                  const scheduleEntry = mapStoredScheduleEntry(appointment)
                  const display = formatScheduleEntry(scheduleEntry)
                  const linkedStudent = appointment.user_profile_id
                    ? studentsById.get(appointment.user_profile_id)
                    : null

                  return (
                    <tr key={appointment.id}>
                      <td>
                        <strong>{appointment.title}</strong>
                        <span>
                          {display.date} · {display.time}
                        </span>
                        <small>{appointment.cal_booking_uid}</small>
                      </td>
                      <td>
                        <strong>{appointment.attendee_name || 'Attendee'}</strong>
                        <span>{appointment.attendee_email || 'Email not provided'}</span>
                      </td>
                      <td>{getScheduleStatusLabel(scheduleEntry)}</td>
                      <td>
                        {linkedStudent ? (
                          <Link href={`/admin/students/${linkedStudent.id}`}>
                            {linkedStudent.name}
                          </Link>
                        ) : (
                          <span>Account unavailable</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppointmentAdminTemplate>
  )
}
