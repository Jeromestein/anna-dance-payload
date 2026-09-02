'use client'

import { Link, useAuth } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

import type { User } from '@/payload-types'

export function StudentNavLink() {
  const { user } = useAuth<User>()
  const pathname = usePathname()

  if (user?.role !== 'administrator') return null

  return (
    <div className="student-admin-nav">
      <Link
        className={`student-admin-nav__link${pathname.startsWith('/admin/students') ? ' active' : ''}`}
        href="/admin/students"
      >
        Student
      </Link>
    </div>
  )
}
