import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import type { User } from '@/payload-types'
import config from '@/payload.config'

export async function getPayloadStaffUser(): Promise<User | null> {
  try {
    const payload = await getPayload({ config })
    const auth = await payload.auth({ headers: await headers() })

    return (auth.user as User | null) ?? null
  } catch {
    return null
  }
}

export async function isPayloadAdministrator() {
  const user = await getPayloadStaffUser()
  return user?.role === 'administrator'
}

export async function requirePayloadAdministrator() {
  const user = await getPayloadStaffUser()

  if (!user) {
    redirect('/admin/login?redirect=%2Fusers')
  }

  if (user.role !== 'administrator') {
    redirect('/admin?error=Administrator+access+is+required.')
  }

  return user
}
