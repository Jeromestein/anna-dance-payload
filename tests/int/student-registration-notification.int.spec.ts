import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  hasNewEmailIdentity,
  sendStudentRegistrationNotification,
} from '@/lib/email/student-registration-notification.server'

const notification = {
  studentName: 'Test Student',
  email: 'TEST-STUDENT@example.com',
  studentPhone: null,
  guardianName: 'Test Guardian',
  guardianPhone: '701-555-0100',
  registeredAt: '2026-09-07T00:52:00.000Z',
}

describe('Student registration notification', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('RESEND_FROM_EMAIL', 'Anna Dance Academy <no-reply@example.com>')
    vi.stubEnv('STUDENT_REGISTRATION_NOTIFICATION_TO', 'academy@example.com')
    vi.stubEnv('CONTACT_TO_EMAIL', 'contact@example.com')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends only the required operational fields to the configured recipient', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendStudentRegistrationNotification(notification)).resolves.toEqual({
      status: 'sent',
    })
    expect(fetchMock).toHaveBeenCalledOnce()

    const [endpoint, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body)) as {
      from: string
      subject: string
      text: string
      to: string[]
    }

    expect(endpoint).toBe('https://api.resend.com/emails')
    expect(body).toEqual({
      from: 'Anna Dance Academy <no-reply@example.com>',
      to: ['academy@example.com'],
      subject: 'New Student registration: Test Student',
      text: [
        'New Student registration',
        '',
        'Student name: Test Student',
        'Registration email: test-student@example.com',
        'Student phone: Not provided',
        'Parent/guardian name: Test Guardian',
        'Parent/guardian phone: 701-555-0100',
        'Registered at: 2026-09-07T00:52:00.000Z',
      ].join('\n'),
    })
    expect(body.text).not.toMatch(/password|token|secret/i)
  })

  it('skips delivery when the Resend API key is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const fetchMock = vi.fn()
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendStudentRegistrationNotification(notification)).resolves.toEqual({
      status: 'skipped',
      reason: 'missing_api_key',
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(warning).toHaveBeenCalledWith(
      'Student registration notification skipped: RESEND_API_KEY is not configured.',
    )
  })

  it('skips delivery when the Resend sender is missing', async () => {
    vi.stubEnv('RESEND_FROM_EMAIL', '')
    const fetchMock = vi.fn()
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendStudentRegistrationNotification(notification)).resolves.toEqual({
      status: 'skipped',
      reason: 'missing_from_email',
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(warning).toHaveBeenCalledWith(
      'Student registration notification skipped: RESEND_FROM_EMAIL is not configured.',
    )
  })

  it('returns failed without exposing registration details when Resend rejects the request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('provider detail', { status: 500 }))
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendStudentRegistrationNotification(notification)).resolves.toEqual({
      status: 'failed',
      reason: 'provider_error',
    })
    expect(error).toHaveBeenCalledWith(
      'Student registration notification failed at the email provider.',
      { status: 500 },
    )
    expect(JSON.stringify(error.mock.calls)).not.toContain(notification.email)
  })

  it('uses the contact and Academy recipient fallbacks in order', async () => {
    vi.stubEnv('STUDENT_REGISTRATION_NOTIFICATION_TO', '')
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await sendStudentRegistrationNotification(notification)

    const [, contactFallback] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(contactFallback.body))).toMatchObject({ to: ['contact@example.com'] })

    vi.stubEnv('CONTACT_TO_EMAIL', '')
    await sendStudentRegistrationNotification(notification)

    const [, academyFallback] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(JSON.parse(String(academyFallback.body))).toMatchObject({
      to: ['annadanceacademy@gmail.com'],
    })
  })

  it('recognizes only a newly created email identity', () => {
    expect(hasNewEmailIdentity(undefined)).toBe(false)
    expect(hasNewEmailIdentity({ identities: [] })).toBe(false)
    expect(hasNewEmailIdentity({ identities: [{ provider: 'google' }] })).toBe(false)
    expect(hasNewEmailIdentity({ identities: [{ provider: 'email' }] })).toBe(true)
  })
})
