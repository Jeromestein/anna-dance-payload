'use client'

import { Link, useAuth } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

import type { User } from '@/payload-types'

export function StudentNavLink() {
  const { user } = useAuth<User>()
  const pathname = usePathname()

  if (user?.role !== 'administrator') return null

  const isActive = pathname.startsWith('/admin/students')

  if (isActive) {
    return (
      <div className="nav__link" id="nav-students">
        <div className="nav__link-indicator" />
        <span className="nav__link-label">Student</span>
      </div>
    )
  }

  return (
    <Link className="nav__link" href="/admin/students" id="nav-students" prefetch={false}>
      <div className="nav__link-indicator" />
      <span className="nav__link-label">Student</span>
    </Link>
  )
}
