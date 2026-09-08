import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendStudentRegistrationNotification } from './student-registration-notification.server'

// userId must come from server-verified Auth, never from a browser request body.
export async function notifyGoogleRegistration(userId: string) {
  try {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.rpc('claim_google_registration_notification', {
      student_id: userId,
    })
    if (error) throw new Error('Claim failed')
    const event = data?.[0]
    if (!event) return

    const result = await sendStudentRegistrationNotification({
      studentName: event.student_name,
      email: event.email,
      registeredAt: event.registered_at,
      studentPhone: null,
      guardianName: null,
      guardianPhone: null,
    })
    const { error: completionError } = await admin
      .from('app_google_registration_notifications')
      .update({ status: result.status, completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('status', 'sending')
    if (completionError) throw new Error('Completion failed')
  } catch {
    // A failed notification must not prevent a successful sign-in or leak Auth data.
    console.error(
      'Google registration notification could not be completed; review the notification ledger.',
    )
  }
}
