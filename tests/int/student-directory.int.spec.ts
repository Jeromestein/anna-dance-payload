import { describe, expect, it } from 'vitest'

import {
  buildStudentSearchFilter,
  getStudentIdFromRouteSegments,
  getStudentInitials,
  getStudentsHref,
  getStudentsPageRange,
  parseStudentsPage,
  STUDENTS_PAGE_SIZE,
} from '@/lib/students/directory'

describe('Student directory helpers', () => {
  it('reads the Student id from Payload catch-all route segments', () => {
    expect(getStudentIdFromRouteSegments(['students', 'student-123'])).toBe('student-123')
    expect(getStudentIdFromRouteSegments(['students'])).toBeUndefined()
    expect(getStudentIdFromRouteSegments(['collections', 'users'])).toBeUndefined()
  })

  it('builds admin paths without exposing the retired users route', () => {
    expect(getStudentsHref({ query: '' })).toBe('/admin/students')
    expect(getStudentsHref({ query: 'Anna', page: 2 })).toBe(
      '/admin/students?q=Anna&page=2',
    )
  })

  it('normalizes invalid pages and calculates a bounded page range', () => {
    expect(parseStudentsPage(undefined)).toBe(1)
    expect(parseStudentsPage('-4')).toBe(1)
    expect(parseStudentsPage('2')).toBe(2)
    expect(getStudentsPageRange(2)).toEqual({
      from: STUDENTS_PAGE_SIZE,
      to: STUDENTS_PAGE_SIZE * 2 - 1,
    })
  })

  it('sanitizes search input before building the Supabase filter', () => {
    expect(buildStudentSearchFilter(' Anna,(); ')).toContain('name.ilike.*Anna*')
    expect(buildStudentSearchFilter('')).toBe('')
  })

  it('creates compact Student initials', () => {
    expect(getStudentInitials('Anna Liu')).toBe('AL')
    expect(getStudentInitials('Jason')).toBe('JA')
  })
})
