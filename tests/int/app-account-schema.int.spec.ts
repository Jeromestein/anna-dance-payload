import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260903170000_create_app_account_tables.sql'),
  'utf8',
)
const removalMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260904111500_drop_legacy_user_profiles.sql'),
  'utf8',
)
const calBookingMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260904153000_add_cal_booking_sync.sql'),
  'utf8',
)

describe('application account schema', () => {
  it('creates and backfills the app tables before removing the legacy profile table', () => {
    expect(migration).toContain('create table if not exists public.app_user_profiles')
    expect(migration).toContain('create table if not exists public.app_payments')
    expect(migration).toContain('create table if not exists public.app_schedule_entries')
    expect(migration).toContain('from public.user_profiles')
    expect(migration).not.toContain('drop table public.user_profiles')
  })

  it('removes the legacy profile table only after checking replacement coverage', () => {
    expect(removalMigration).toContain("to_regclass('public.app_user_profiles')")
    expect(removalMigration).toContain('left join public.app_user_profiles')
    expect(removalMigration).toContain('where replacement.id is null')
    expect(removalMigration).toContain('drop table if exists public.user_profiles')
    expect(removalMigration).not.toMatch(/drop table[^;]+cascade/i)
  })

  it('moves new profile creation and email synchronization to the app table', () => {
    expect(migration).toContain('insert into public.app_user_profiles')
    expect(migration).toContain('update public.app_user_profiles')
    expect(migration).toContain('drop function if exists public.is_admin()')
  })

  it('limits account access to records owned by the authenticated user', () => {
    expect(migration).toContain('using ((select auth.uid()) = id)')
    expect(migration).toContain('using ((select auth.uid()) = user_profile_id)')
    expect(migration).toContain('grant select on table public.app_payments to authenticated')
    expect(migration).toContain(
      'grant select on table public.app_schedule_entries to authenticated',
    )
    expect(migration).not.toContain(
      'grant all privileges on table public.app_payments to authenticated',
    )
  })

  it('stores money, schedule timing, and provider references without card data', () => {
    expect(migration).toContain('amount_cents integer not null')
    expect(migration).toContain('stripe_checkout_session_id text unique')
    expect(migration).toContain('starts_at timestamptz not null')
    expect(migration).toContain('cal_booking_uid text unique')
    expect(migration).not.toMatch(/card_number|card_cvc|bank_account_number/)
  })

  it('supports account-linked Cal.com appointments with guarded intent storage', () => {
    expect(calBookingMigration).toContain('create table if not exists public.app_booking_intents')
    expect(calBookingMigration).toContain('alter column user_profile_id drop not null')
    expect(calBookingMigration).toContain("match_status in ('linked', 'unmatched', 'needs_review')")
    expect(calBookingMigration).toContain('app_schedule_entries_booking_intent_unique')
    expect(calBookingMigration).toContain('grant insert on table public.app_booking_intents')
    expect(calBookingMigration).not.toContain('grant select on table public.app_booking_intents')
  })
})
