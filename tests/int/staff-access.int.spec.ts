import { describe, expect, it } from 'vitest'

import {
  administratorFieldAccess,
  administratorOnly,
  administratorOrSelf,
  isAdministratorUser,
} from '@/access/staff'
import { Users } from '@/collections/Users'

const administrator = {
  id: 1,
  role: 'administrator',
}

const contentEditor = {
  id: 2,
  role: 'content-editor',
}

function accessArgs(user: typeof administrator | typeof contentEditor | null) {
  return {
    req: { user },
  } as never
}

describe('Payload staff access', () => {
  it('recognizes only administrators as staff-account managers', () => {
    expect(isAdministratorUser(administrator)).toBe(true)
    expect(isAdministratorUser(contentEditor)).toBe(false)
    expect(isAdministratorUser(null)).toBe(false)
  })

  it('limits staff-account creation and deletion to administrators', async () => {
    expect(await administratorOnly(accessArgs(administrator))).toBe(true)
    expect(await administratorOnly(accessArgs(contentEditor))).toBe(false)
    expect(await administratorOnly(accessArgs(null))).toBe(false)
  })

  it('allows content editors to read and update only their own record', async () => {
    expect(await administratorOrSelf(accessArgs(administrator))).toBe(true)
    expect(await administratorOrSelf(accessArgs(contentEditor))).toEqual({
      id: { equals: contentEditor.id },
    })
    expect(await administratorOrSelf(accessArgs(null))).toBe(false)
  })

  it('limits role changes to administrators', async () => {
    expect(await administratorFieldAccess(accessArgs(administrator))).toBe(true)
    expect(await administratorFieldAccess(accessArgs(contentEditor))).toBe(false)
    expect(await administratorFieldAccess(accessArgs(null))).toBe(false)
  })

  it('wires the staff collection to the role-aware access rules', () => {
    expect(Users.access?.create).toBe(administratorOnly)
    expect(Users.access?.delete).toBe(administratorOnly)
    expect(Users.access?.read).toBe(administratorOrSelf)
    expect(Users.access?.update).toBe(administratorOrSelf)

    const roleField = Users.fields.find(
      (field) => 'name' in field && field.name === 'role',
    )
    expect(roleField && 'access' in roleField ? roleField.access?.create : undefined).toBe(
      administratorFieldAccess,
    )
    expect(roleField && 'access' in roleField ? roleField.access?.update : undefined).toBe(
      administratorFieldAccess,
    )
  })
})
