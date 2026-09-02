import Link from 'next/link'

import type { User } from '@/payload-types'

type StaffToolbarProps = {
  user: Pick<User, 'email' | 'role'>
}

export function StaffToolbar({ user }: StaffToolbarProps) {
  return (
    <aside className="staff-toolbar" aria-label="Staff toolbar">
      <div className="staff-toolbar__inner">
        <div className="staff-toolbar__links">
          <span className="staff-toolbar__status">
            <span aria-hidden="true" />
            Staff
          </span>
          <Link href="/admin">CMS</Link>
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
