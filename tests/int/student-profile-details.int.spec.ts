import { describe, expect, it } from 'vitest'
import {
  isValidBirthDate,
  readStudentDetails,
  studentDetailsError,
  isStudentProfileComplete,
} from '@/lib/students/profile'

const fields = {
  date_of_birth: '2016-02-29',
  address_line1: '123 Test Street',
  address_line2: '',
  city: 'Irvine',
  state: 'CA',
  postal_code: '92618',
  health_notes: 'N/A',
}
function details(overrides: Record<string, string> = {}) {
  const form = new FormData()
  for (const [key, value] of Object.entries({ ...fields, ...overrides })) form.set(key, value)
  return readStudentDetails(form)
}

describe('Required student enrollment details', () => {
  it('accepts N/A explicitly entered by a family and optional apartment', () => {
    expect(studentDetailsError(details())).toBeNull()
    expect(details().address_line2).toBeNull()
  })
  it.each(['date_of_birth', 'address_line1', 'city', 'state', 'postal_code', 'health_notes'])(
    'rejects empty or whitespace-only %s',
    (key) => {
      expect(studentDetailsError(details({ [key]: ' \n\t ' }))).not.toBeNull()
    },
  )
  it('does not synthesize N/A for missing health notes', () => {
    expect(readStudentDetails(new FormData()).health_notes).toBeNull()
  })
  it('rejects impossible dates and future dates while accepting leap days', () => {
    expect(isValidBirthDate('2025-02-29', '2026-09-24')).toBe(false)
    expect(isValidBirthDate('2026-09-25', '2026-09-24')).toBe(false)
    expect(isValidBirthDate('2016-02-29', '2026-09-24')).toBe(true)
  })
  it('requires a valid phone without requiring it to differ from a guardian phone', () => {
    expect(isStudentProfileComplete({ ...details(), phone: '949-555-0100' })).toBe(true)
    expect(isStudentProfileComplete({ ...details(), phone: '' })).toBe(false)
  })
  it('enforces size limits on notes and address', () => {
    expect(studentDetailsError(details({ health_notes: 'a'.repeat(2001) }))).not.toBeNull()
    expect(studentDetailsError(details({ address_line1: 'a'.repeat(201) }))).not.toBeNull()
  })
})
