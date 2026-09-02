import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter, SetStepNav } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { updateManagedStudentProfile } from '@/actions/student-profiles'
import { isAdministratorUser } from '@/access/staff'
import {
  buildStudentSearchFilter,
  getStudentIdFromRouteSegments,
  getStudentInitials,
  getStudentsHref,
  getStudentsPageRange,
  parseStudentsPage,
  STUDENTS_PAGE_SIZE,
} from '@/lib/students/directory'
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin'

type StudentProfile = {
  id: string
  email: string
  name: string
  phone: string | null
  guardian_name: string | null
  guardian_phone: string | null
  created_at: string
}

function getSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function requireAdministrator(props: AdminViewServerProps, redirectPath: string) {
  const user = props.initPageResult.req.user

  if (!user) {
    redirect(`/admin/login?redirect=${encodeURIComponent(redirectPath)}`)
  }
  if (!isAdministratorUser(user)) {
    redirect('/admin?error=Administrator+access+is+required.')
  }
}

function StudentAdminTemplate({
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function StudentDirectory({ students }: { students: StudentProfile[] }) {
  return (
    <>
      <div className="table student-admin__table-wrap">
        <table className="student-admin__table">
          <thead>
            <tr>
              <th scope="col">Student</th>
              <th scope="col">Email</th>
              <th scope="col">Phone</th>
              <th scope="col">Parent/guardian</th>
              <th scope="col">Joined</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>
                  <Link className="student-admin__name-link" href={`/admin/students/${student.id}`}>
                    {student.name}
                  </Link>
                </td>
                <td>
                  <a href={`mailto:${student.email}`}>{student.email}</a>
                </td>
                <td>
                  {student.phone ? (
                    <a href={`tel:${student.phone}`}>{student.phone}</a>
                  ) : (
                    <span className="student-admin__empty-value">Not provided</span>
                  )}
                </td>
                <td>
                  {student.guardian_name || student.guardian_phone ? (
                    <>
                      {student.guardian_name && <strong>{student.guardian_name}</strong>}
                      {student.guardian_phone && (
                        <a href={`tel:${student.guardian_phone}`}>{student.guardian_phone}</a>
                      )}
                    </>
                  ) : (
                    <span className="student-admin__empty-value">Not provided</span>
                  )}
                </td>
                <td>{formatDate(student.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="student-admin__mobile-list" aria-label="Student">
        {students.map((student) => (
          <li key={student.id}>
            <Link
              className="student-admin__mobile-link"
              href={`/admin/students/${student.id}`}
              aria-label={`View ${student.name}'s profile`}
            >
              <span className="student-admin__avatar" aria-hidden="true">
                {getStudentInitials(student.name)}
              </span>
              <span className="student-admin__identity">
                <strong>{student.name}</strong>
                <span>{student.email}</span>
              </span>
              <span className="student-admin__chevron" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

export async function StudentListView(props: AdminViewServerProps) {
  requireAdministrator(props, '/admin/students')

  const query = String(getSearchParam(props.searchParams?.q) ?? '')
    .trim()
    .slice(0, 100)
  const currentPage = parseStudentsPage(getSearchParam(props.searchParams?.page))
  const { from, to } = getStudentsPageRange(currentPage)
  const routeError = getSearchParam(props.searchParams?.error)

  if (!isSupabaseAdminConfigured()) {
    return (
      <StudentAdminTemplate props={props}>
        <div className="student-admin">
          <h1>Student</h1>
          <p className="student-admin__alert student-admin__alert--error" role="alert">
            Student management is not configured. Add the Supabase URL and server-only service role
            key, then restart the app.
          </p>
        </div>
      </StudentAdminTemplate>
    )
  }

  const supabase = createSupabaseAdminClient()
  let studentsQuery = supabase
    .from('user_profiles')
    .select('id, email, name, phone, guardian_name, guardian_phone, created_at', {
      count: 'exact',
    })
  const searchFilter = buildStudentSearchFilter(query)
  if (searchFilter) studentsQuery = studentsQuery.or(searchFilter)

  const studentsResult = await studentsQuery
    .order('created_at', { ascending: false })
    .range(from, to)

  const error = studentsResult.error
  const students = (studentsResult.data ?? []) as StudentProfile[]
  const filteredCount = studentsResult.count ?? 0
  const totalPages = Math.max(1, Math.ceil(filteredCount / STUDENTS_PAGE_SIZE))

  if (!error && currentPage > totalPages) {
    redirect(getStudentsHref({ query, page: totalPages }))
  }

  const firstVisibleStudent = filteredCount === 0 ? 0 : from + 1
  const lastVisibleStudent = Math.min(to + 1, filteredCount)

  return (
    <StudentAdminTemplate props={props}>
      <div className="student-admin">
        <SetStepNav nav={[{ label: 'Student' }]} />
        <header className="list-header student-admin__header">
          <div className="list-header__content">
            <div className="list-header__title-and-actions">
              <h1 className="list-header__title">Student</h1>
            </div>
          </div>
          <div className="list-header__after-header-content">
            <p>Students who can access the academy website.</p>
          </div>
        </header>

        {routeError && (
          <p className="student-admin__alert student-admin__alert--error" role="alert">
            {routeError}
          </p>
        )}

        <form className="student-admin__search" action="/admin/students" method="get" role="search">
          <label className="student-admin__visually-hidden" htmlFor="student-search">
            Search Student
          </label>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="m16.2 16.2 4.3 4.3" />
          </svg>
          <input
            id="student-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search by name, email, or phone"
            maxLength={100}
          />
        </form>

        {error && (
          <p className="student-admin__alert student-admin__alert--error" role="alert">
            We could not load Student information. Please try again.
          </p>
        )}
        {!error && students.length === 0 && (
          <div className="student-admin__empty">
            <h2>No Student found</h2>
            <p>Try another search.</p>
          </div>
        )}
        {!error && students.length > 0 && <StudentDirectory students={students} />}

        {!error && (
          <div className="student-admin__footer">
            <p>
              Showing {firstVisibleStudent}–{lastVisibleStudent} of {filteredCount}
            </p>
            {totalPages > 1 && (
              <nav className="student-admin__pagination" aria-label="Student pages">
                {currentPage > 1 ? (
                  <Link href={getStudentsHref({ query, page: currentPage - 1 })}>Previous</Link>
                ) : (
                  <span aria-disabled="true">Previous</span>
                )}
                <strong>
                  Page {currentPage} of {totalPages}
                </strong>
                {currentPage < totalPages ? (
                  <Link href={getStudentsHref({ query, page: currentPage + 1 })}>Next</Link>
                ) : (
                  <span aria-disabled="true">Next</span>
                )}
              </nav>
            )}
          </div>
        )}
      </div>
    </StudentAdminTemplate>
  )
}

export async function StudentDetailView(props: AdminViewServerProps) {
  const id = getStudentIdFromRouteSegments(props.params?.segments)
  const path = id ? `/admin/students/${id}` : '/admin/students'
  requireAdministrator(props, path)

  if (!id || !isSupabaseAdminConfigured()) notFound()

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, name, phone, guardian_name, guardian_phone, created_at')
    .eq('id', id)
    .maybeSingle<StudentProfile>()

  if (error || !data) notFound()

  const routeError = getSearchParam(props.searchParams?.error)
  const message = getSearchParam(props.searchParams?.message)

  return (
    <StudentAdminTemplate props={props}>
      <div className="student-admin student-admin--detail">
        <SetStepNav
          nav={[
            { label: 'Student', url: '/admin/students' },
            { label: data.name },
          ]}
        />
        <header className="student-admin__header student-admin__header--detail">
          <Link className="student-admin__back-link" href="/admin/students">
            Student
          </Link>
          <h1>{data.name}</h1>
          <p>Review and update this Student’s contact information.</p>
        </header>

        <p className="student-admin__notice" role="status">
          Changes will affect this Student profile immediately.
        </p>
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

        <form action={updateManagedStudentProfile} className="student-admin__form">
          <input type="hidden" name="target_student_id" value={data.id} />

          <div className="student-admin__form-heading">
            <h2>Personal information</h2>
            <p>These details belong to the Student using this login.</p>
          </div>

          <div className="student-admin__fields">
            <label htmlFor="student-name">
              Name
              <input
                id="student-name"
                name="name"
                type="text"
                maxLength={100}
                defaultValue={data.name}
                required
              />
            </label>
            <label htmlFor="student-phone">
              Phone number <span>Optional</span>
              <input
                id="student-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                maxLength={24}
                defaultValue={data.phone ?? ''}
              />
            </label>
            <label htmlFor="student-email">
              Email
              <input id="student-email" type="email" value={data.email} readOnly />
            </label>
            <label htmlFor="student-joined">
              Joined
              <input id="student-joined" type="text" value={formatDate(data.created_at)} readOnly />
            </label>
          </div>

          <fieldset className="student-admin__guardian">
            <legend>
              Parent/guardian <span>Optional</span>
            </legend>
            <div className="student-admin__fields">
              <label htmlFor="student-guardian-name">
                Name
                <input
                  id="student-guardian-name"
                  name="guardian_name"
                  type="text"
                  maxLength={100}
                  defaultValue={data.guardian_name ?? ''}
                />
              </label>
              <label htmlFor="student-guardian-phone">
                Phone number
                <input
                  id="student-guardian-phone"
                  name="guardian_phone"
                  type="tel"
                  inputMode="tel"
                  maxLength={24}
                  defaultValue={data.guardian_phone ?? ''}
                />
              </label>
            </div>
          </fieldset>

          <div className="student-admin__save-row">
            <button type="submit">Save changes</button>
          </div>
        </form>
      </div>
    </StudentAdminTemplate>
  )
}
