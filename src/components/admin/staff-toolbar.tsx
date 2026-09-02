import Link from 'next/link'

import type { User } from '@/payload-types'

type StaffToolbarProps = {
  user: Pick<User, 'email' | 'role'>
}

export function StaffToolbar({ user }: StaffToolbarProps) {
  return (
    <aside className="staff-toolbar" aria-label="Admin toolbar">
      <div className="staff-toolbar__inner">
        <div className="staff-toolbar__links">
          <Link className="staff-toolbar__admin-link" href="/admin">
            <span aria-hidden="true" />
            Admin
          </Link>
          {user.role === 'administrator' && <Link href="/admin/students">Student</Link>}
        </div>

        <div className="staff-toolbar__account">
          <span className="staff-toolbar__email">{user.email}</span>
          <Link href="/admin/logout">Log out</Link>
        </div>
      </div>
    </aside>
  )
}
