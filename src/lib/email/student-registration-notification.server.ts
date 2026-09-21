import 'server-only'
import { siteOrigin } from '@/lib/stripe/config'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const DEFAULT_NOTIFICATION_TO = 'annadanceacademy@gmail.com'

type SignUpUser = {
  identities?: Array<{ provider?: string }> | null
}

export type StudentRegistrationNotification = {
  userId?: string
  studentName: string
  email: string
  studentPhone: string | null
  guardianName: string | null
  guardianPhone: string | null
  registeredAt: string
}

export type StudentRegistrationNotificationResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: 'missing_api_key' | 'missing_from_email' }
  | { status: 'failed'; reason: 'provider_error' | 'network_error' }

function cleanSingleLine(value: string, maxLength: number) {
  return value
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function hasNewEmailIdentity<T extends SignUpUser>(
  user: T | null | undefined,
): user is T & { identities: Array<{ provider?: string }> } {
  return user?.identities?.some((identity) => identity.provider === 'email') ?? false
}

export async function sendStudentRegistrationNotification(
  notification: StudentRegistrationNotification,
): Promise<StudentRegistrationNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()

  if (!apiKey) {
    console.warn('Student registration notification skipped: RESEND_API_KEY is not configured.')
    return { status: 'skipped', reason: 'missing_api_key' }
  }

  if (!from) {
    console.warn('Student registration notification skipped: RESEND_FROM_EMAIL is not configured.')
    return { status: 'skipped', reason: 'missing_from_email' }
  }

  const to =
    process.env.STUDENT_REGISTRATION_NOTIFICATION_TO?.trim() ||
    process.env.CONTACT_TO_EMAIL?.trim() ||
    DEFAULT_NOTIFICATION_TO
  const studentName = cleanSingleLine(notification.studentName, 100)
  const email = cleanSingleLine(notification.email, 254).toLowerCase()
  const studentPhone = notification.studentPhone
    ? cleanSingleLine(notification.studentPhone, 24)
    : 'Not provided'
  const guardianName = notification.guardianName
    ? cleanSingleLine(notification.guardianName, 100)
    : 'Not provided'
  const guardianPhone = notification.guardianPhone
    ? cleanSingleLine(notification.guardianPhone, 24)
    : 'Not provided'
  const registeredAt = cleanSingleLine(notification.registeredAt, 50)
  let adminLink = ''
  if (notification.userId && /^[0-9a-f-]{36}$/i.test(notification.userId)) {
    try {
      adminLink = `${siteOrigin()}/admin/students/${notification.userId}`
    } catch {
      /* Signup must not depend on billing URL configuration. */
    }
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      signal: AbortSignal.timeout(5_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `New Student registration: ${studentName}`,
        text: [
          'New Student registration',
          '',
          `Student name: ${studentName}`,
          `Registration email: ${email}`,
          `Student phone: ${studentPhone}`,
          `Parent/guardian name: ${guardianName}`,
          `Parent/guardian phone: ${guardianPhone}`,
          `Registered at: ${registeredAt}`,
          ...(adminLink ? ['', `View account and create a bill: ${adminLink}`] : []),
        ].join('\n'),
      }),
    })

    if (!response.ok) {
      console.error('Student registration notification failed at the email provider.', {
        status: response.status,
      })
      return { status: 'failed', reason: 'provider_error' }
    }

    return { status: 'sent' }
  } catch {
    console.error('Student registration notification failed before the provider responded.')
    return { status: 'failed', reason: 'network_error' }
  }
}
