import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  buildUserSearchFilter,
  getUsersHref,
  getUsersPageRange,
  parseUsersPage,
  USERS_PAGE_SIZE,
  type UserDirectoryFilter,
} from '@/lib/users/directory'
import { requirePayloadAdministrator } from '@/lib/staff/auth'
import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/admin'
import { UserDirectory, type UserDirectoryProfile } from './user-directory'

export const metadata: Metadata = { title: 'Users' }
export const dynamic = 'force-dynamic'

type UsersPageProps = {
  searchParams: Promise<{ page?: string; q?: string; role?: string; error?: string }>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams
  await requirePayloadAdministrator()

  const query = String(params.q ?? '')
    .trim()
    .slice(0, 100)
  const selectedRole: UserDirectoryFilter =
    params.role === 'admin' || params.role === 'student' ? params.role : 'all'
  const currentPage = parseUsersPage(params.page)
  const { from, to } = getUsersPageRange(currentPage)

  if (!isSupabaseAdminConfigured()) {
    return (
      <section className="admin-users-page">
        <div className="page-shell admin-users-layout">
          <header className="admin-users-header">
            <div>
              <p className="eyebrow">Admin</p>
              <h1>Users</h1>
            </div>
            <Link className="button button-secondary" href="/admin">
              Back to CMS
            </Link>
          </header>
          <p className="auth-alert auth-alert-error" role="alert">
            Student management is not configured. Add the academy Supabase URL, publishable key, and
            server-only service role key, then restart the app.
          </p>
        </div>
      </section>
    )
  }

  const supabase = createSupabaseAdminClient()
  let usersQuery = supabase
    .from('user_profiles')
    .select('id, email, role, name, phone, guardian_name, guardian_phone, created_at', {
      count: 'exact',
    })

  if (selectedRole !== 'all') usersQuery = usersQuery.eq('role', selectedRole)
  const searchFilter = buildUserSearchFilter(query)
  if (searchFilter) usersQuery = usersQuery.or(searchFilter)

  const [usersResult, allUsersResult, studentsResult, adminsResult] = await Promise.all([
    usersQuery.order('created_at', { ascending: false }).range(from, to),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student'),
    supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
  ])

  const error =
    usersResult.error ?? allUsersResult.error ?? studentsResult.error ?? adminsResult.error
  const users = (usersResult.data ?? []) as UserDirectoryProfile[]
  const filteredCount = usersResult.count ?? 0
  const totalPages = Math.max(1, Math.ceil(filteredCount / USERS_PAGE_SIZE))

  if (!error && currentPage > totalPages) {
    redirect(getUsersHref({ role: selectedRole, query, page: totalPages }))
  }

  const firstVisibleUser = filteredCount === 0 ? 0 : from + 1
  const lastVisibleUser = Math.min(to + 1, filteredCount)

  return (
    <section className="admin-users-page">
      <div className="page-shell admin-users-layout">
        <header className="admin-users-header">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Users</h1>
            <p>Manage student and parent account information.</p>
          </div>
          <Link className="button button-secondary" href="/admin">
            Back to CMS
          </Link>
        </header>

        {params.error && (
          <p className="auth-alert auth-alert-error" role="alert">
            {params.error}
          </p>
        )}

        <div className="admin-user-stats" aria-label="User totals">
          <div>
            <strong>{allUsersResult.count ?? 0}</strong>
            <span>All users</span>
          </div>
          <div>
            <strong>{studentsResult.count ?? 0}</strong>
            <span>Students</span>
          </div>
          <div>
            <strong>{adminsResult.count ?? 0}</strong>
            <span>Legacy admins</span>
          </div>
        </div>

        <div className="admin-user-tools">
          <nav className="admin-role-filters" aria-label="Filter users by role">
            {(['all', 'student', 'admin'] as const).map((role) => (
              <Link
                key={role}
                href={getUsersHref({ role, query })}
                className={selectedRole === role ? 'active' : ''}
              >
                {role === 'all' ? 'All users' : role === 'student' ? 'Students' : 'Legacy admins'}
              </Link>
            ))}
          </nav>
          <form className="admin-user-search" action="/users" method="get">
            {selectedRole !== 'all' && <input type="hidden" name="role" value={selectedRole} />}
            <label htmlFor="user-search">Search users</label>
            <div>
              <input
                id="user-search"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Name, email, or phone"
                maxLength={100}
              />
              <button className="button" type="submit">
                Search
              </button>
            </div>
          </form>
        </div>

        {error && (
          <p className="auth-alert auth-alert-error" role="alert">
            We could not load the users. Please try again.
          </p>
        )}
        {!error && users.length === 0 && (
          <div className="admin-users-empty">
            <h2>No users found</h2>
            <p>Try another search or filter.</p>
          </div>
        )}
        {!error && users.length > 0 && <UserDirectory users={users} />}

        {!error && (
          <div className="admin-users-results-footer">
            <p className="admin-users-result-count">
              Showing {firstVisibleUser}–{lastVisibleUser} of {filteredCount} users
            </p>
            {totalPages > 1 && (
              <nav className="admin-users-pagination" aria-label="User list pages">
                {currentPage > 1 ? (
                  <Link href={getUsersHref({ role: selectedRole, query, page: currentPage - 1 })}>
                    Previous
                  </Link>
                ) : (
                  <span aria-disabled="true">Previous</span>
                )}
                <strong>
                  Page {currentPage} of {totalPages}
                </strong>
                {currentPage < totalPages ? (
                  <Link href={getUsersHref({ role: selectedRole, query, page: currentPage + 1 })}>
                    Next
                  </Link>
                ) : (
                  <span aria-disabled="true">Next</span>
                )}
              </nav>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
