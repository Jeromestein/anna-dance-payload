import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260902183000_remove_customer_admin_privileges.sql',
  ),
  'utf8',
)

describe('Supabase customer authorization boundary', () => {
  it('removes legacy customer-admin authorization functions', () => {
    expect(migration).toContain('drop function if exists public.is_admin()')
    expect(migration).toContain(
      'drop function if exists public.admin_update_user_profile(',
    )
  })

  it('limits authenticated profile reads to the current customer', () => {
    expect(migration).toContain('create policy "Users can view their own profile"')
    expect(migration).toContain('using ((select auth.uid()) = id)')
    expect(migration).not.toContain('grant execute')
  })

  it('keeps privileged profile access on the server-only service role', () => {
    expect(migration).toContain(
      'grant all privileges on table public.user_profiles to service_role',
    )
    expect(migration).toContain(
      'grant update (name, phone, guardian_name, guardian_phone, updated_at)',
    )
  })
})
