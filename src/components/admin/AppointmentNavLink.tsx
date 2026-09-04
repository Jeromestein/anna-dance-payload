'use client'

import { Link, useAuth } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

import type { User } from '@/payload-types'

export function AppointmentNavLink() {
  const { user } = useAuth<User>()
  const pathname = usePathname()

  if (user?.role !== 'administrator') return null

  const isActive = pathname.startsWith('/admin/appointments')

  if (isActive) {
    return (
      <div className="nav__link" id="nav-appointments">
        <div className="nav__link-indicator" />
        <span className="nav__link-label">Appointments</span>
      </div>
    )
  }

  return (
    <Link className="nav__link" href="/admin/appointments" id="nav-appointments" prefetch={false}>
      <div className="nav__link-indicator" />
      <span className="nav__link-label">Appointments</span>
    </Link>
  )
}
