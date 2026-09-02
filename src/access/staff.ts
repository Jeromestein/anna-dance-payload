import type { Access, FieldAccess } from 'payload'

type StaffUser = {
  id: number | string
  role?: string | null
}

export function isAdministratorUser(user: unknown) {
  if (!user || typeof user !== 'object') return false

  return (user as StaffUser).role === 'administrator'
}

export const administratorOnly: Access = ({ req: { user } }) => isAdministratorUser(user)

export const administratorOrSelf: Access = ({ req: { user } }) => {
  const staffUser = user as StaffUser | null

  if (!staffUser) return false
  if (isAdministratorUser(staffUser)) return true

  return {
    id: {
      equals: staffUser.id,
    },
  }
}

export const administratorFieldAccess: FieldAccess = ({ req: { user } }) =>
  isAdministratorUser(user)
