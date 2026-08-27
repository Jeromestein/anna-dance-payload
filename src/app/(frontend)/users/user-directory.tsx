import Link from 'next/link'
import { getUserInitials, type UserDirectoryRole } from '@/lib/users/directory'

export type UserDirectoryProfile = {
  id: string
  email: string
  role: UserDirectoryRole
  name: string
  phone: string | null
  guardian_name: string | null
  guardian_phone: string | null
  created_at: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function UserDirectory({ users }: { users: UserDirectoryProfile[] }) {
  return (
    <>
      <div className="admin-users-table-wrap">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Role</th>
              <th scope="col">Phone</th>
              <th scope="col">Parent/guardian</th>
              <th scope="col">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <Link className="admin-user-name-link" href={`/users/${user.id}`}>
                    <strong>{user.name}</strong>
                    <span>View profile →</span>
                  </Link>
                  <a href={`mailto:${user.email}`}>{user.email}</a>
                </td>
                <td>
                  <span className={`admin-role-badge ${user.role}`}>{user.role}</span>
                </td>
                <td>
                  {user.phone ? (
                    <a href={`tel:${user.phone}`}>{user.phone}</a>
                  ) : (
                    <span className="admin-user-empty-value">Not provided</span>
                  )}
                </td>
                <td>
                  {user.guardian_name || user.guardian_phone ? (
                    <>
                      {user.guardian_name && <strong>{user.guardian_name}</strong>}
                      {user.guardian_phone && (
                        <a href={`tel:${user.guardian_phone}`}>{user.guardian_phone}</a>
                      )}
                    </>
                  ) : (
                    <span className="admin-user-empty-value">Not provided</span>
                  )}
                </td>
                <td>{formatDate(user.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="admin-users-mobile-list" aria-label="Users">
        {users.map((user) => (
          <li key={user.id}>
            <Link
              className="admin-user-mobile-link"
              href={`/users/${user.id}`}
              aria-label={`View ${user.name}'s profile`}
            >
              <span className="admin-user-avatar" aria-hidden="true">
                {getUserInitials(user.name)}
              </span>
              <span className="admin-user-mobile-identity">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </span>
              <span className="admin-user-mobile-action">
                <span className={`admin-role-badge ${user.role}`}>{user.role}</span>
                <span className="admin-user-chevron" aria-hidden="true">
                  ›
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
