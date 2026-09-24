import { isValidPhone } from '@/lib/auth/validation'

export type StudentDetails = {
  date_of_birth: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  health_notes: string | null
}

export const STUDENT_DETAILS_SELECT =
  'date_of_birth,address_line1,address_line2,city,state,postal_code,health_notes'

export function todayDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
}

export function isValidBirthDate(value: string, today = todayDate()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > today) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function readStudentDetails(form: FormData): StudentDetails {
  const read = (key: string) => String(form.get(key) ?? '').trim() || null
  return {
    date_of_birth: read('date_of_birth'),
    address_line1: read('address_line1'),
    address_line2: read('address_line2'),
    city: read('city'),
    state: read('state'),
    postal_code: read('postal_code'),
    health_notes: read('health_notes'),
  }
}

export function studentDetailsError(details: StudentDetails): string | null {
  if (!isValidBirthDate(details.date_of_birth ?? ''))
    return 'Enter the student’s valid date of birth, from 1900 through today.'
  for (const [key, label, max] of [
    ['address_line1', 'street address', 200],
    ['city', 'city', 100],
    ['state', 'state', 100],
    ['postal_code', 'ZIP / postal code', 20],
  ] as const) {
    const value = details[key]?.trim()
    if (!value || value.length > max) return `Enter a ${label} of up to ${max} characters.`
  }
  if ((details.address_line2?.length ?? 0) > 200)
    return 'Apartment / unit must be no more than 200 characters.'
  if (!details.health_notes?.trim() || details.health_notes.length > 2000)
    return 'List allergies and relevant health conditions (up to 2,000 characters). If none, enter N/A.'
  return null
}

export function isStudentProfileComplete(profile: StudentDetails & { phone: string | null }) {
  return isValidPhone(profile.phone ?? '') && !studentDetailsError(profile)
}
