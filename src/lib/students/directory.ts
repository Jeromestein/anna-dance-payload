export const STUDENTS_PAGE_SIZE = 20

export function getStudentIdFromRouteSegments(segments: string | string[] | undefined) {
  if (!Array.isArray(segments) || segments[0] !== 'students') return undefined

  return segments[1]
}

const STUDENT_SEARCH_COLUMNS = [
  'name',
  'email',
  'phone',
  'guardian_name',
  'guardian_phone',
] as const

export function parseStudentsPage(value: string | undefined) {
  const page = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

export function getStudentsPageRange(page: number) {
  const from = (page - 1) * STUDENTS_PAGE_SIZE
  return { from, to: from + STUDENTS_PAGE_SIZE - 1 }
}

export function getStudentsHref({ query, page = 1 }: { query: string; page?: number }) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (page > 1) params.set('page', String(page))

  const value = params.toString()
  return value ? `/admin/students?${value}` : '/admin/students'
}

export function buildStudentSearchFilter(query: string) {
  const safeQuery = query
    .trim()
    .slice(0, 100)
    .replace(/[^\p{L}\p{N}@.+\-\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!safeQuery) return ''

  const pattern = `*${safeQuery}*`
  return STUDENT_SEARCH_COLUMNS.map((column) => `${column}.ilike.${pattern}`).join(',')
}

export function getStudentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'S'
  if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase()
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}`.toLocaleUpperCase()
}
