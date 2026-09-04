import { describe, expect, it } from 'vitest'

import { getSafeNextPath } from '@/lib/auth/redirects'

describe('authentication return paths', () => {
  it('keeps same-site paths, queries, and anchors', () => {
    expect(getSafeNextPath('/schedule#book')).toBe('/schedule#book')
    expect(getSafeNextPath('/account?tab=schedule')).toBe('/account?tab=schedule')
  })

  it('rejects external and malformed return targets', () => {
    expect(getSafeNextPath('https://example.com')).toBe('/account')
    expect(getSafeNextPath('//example.com')).toBe('/account')
    expect(getSafeNextPath('/\\example.com')).toBe('/account')
    expect(getSafeNextPath(null)).toBe('/account')
  })
})
