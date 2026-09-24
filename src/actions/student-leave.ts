'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { leaveReasonError } from '@/lib/leave/model'
import { readLeaveReceipt, signLeaveReceipt, type LeaveReceipt } from '@/lib/leave/receipt.server'
import {
  leaveEmailConfig,
  leaveEmailPayloads,
  sendLeaveEmails,
} from '@/lib/email/student-leave.server'

export type LeaveActionState = {
  error?: string
  success?: string
  warning?: string
  retryToken?: string
  remaining?: number
}

export async function submitStudentLeave(
  _: LeaveActionState,
  form: FormData,
): Promise<LeaveActionState> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  const user = data?.user
  if (error || !user?.email || !user.email_confirmed_at)
    return { error: 'Please sign in with a verified email to submit a leave request.' }

  const retryToken = String(form.get('retry_token') ?? '')
  let receipt: LeaveReceipt
  let token: string
  if (retryToken) {
    const saved = readLeaveReceipt(retryToken, user.id)
    if (!saved)
      return {
        error:
          'This email retry has expired. Your leave request is still recorded. Please contact the Academy about the notification.',
      }
    receipt = saved
    token = retryToken
  } else {
    const reason = String(form.get('reason') ?? '').trim()
    const reasonError = leaveReasonError(reason)
    if (reasonError) return { error: reasonError }
    const first = String(form.get('first_leave_at') ?? '') || null
    const second = String(form.get('second_leave_at') ?? '') || null
    if ([first, second].some((value) => value !== null && !Number.isFinite(Date.parse(value))))
      return { error: 'Refresh the page before submitting your request.' }
    try {
      leaveEmailConfig()
    } catch {
      return {
        error:
          'Leave notifications are unavailable. No request was recorded. Please contact the Academy.',
      }
    }
    const admin = createSupabaseAdminClient()
    const profile = await admin.from('app_user_profiles').select('name').eq('id', user.id).single()
    if (profile.error || !profile.data)
      return { error: 'We could not load your student profile. Please try again.' }
    const recorded = await admin.rpc('app_record_student_leave', {
      p_owner: user.id,
      p_expected_first: first,
      p_expected_second: second,
    })
    if (recorded.error || !recorded.data) {
      revalidatePath('/account')
      const errors: Record<string, string> = {
        'No leave requests remain in this period':
          'You have used both leave requests for this period.',
        'Leave balance changed; refresh before submitting':
          'Your leave balance changed. Refresh the page to check whether your request was already recorded before submitting again.',
      }
      return {
        error:
          errors[recorded.error?.message ?? ''] ??
          'We could not confirm your request. Refresh the page and check your leave times before trying again.',
      }
    }
    const submittedAt = recorded.data.submitted_at as string
    const remaining = recorded.data.remaining as number
    receipt = {
      owner: user.id,
      submittedAt,
      remaining,
      expiresAt: Date.now() + 22 * 3600000,
      emails: leaveEmailPayloads({
        name: profile.data.name,
        email: user.email,
        reason,
        submittedAt,
        remaining,
      }),
    }
    token = signLeaveReceipt(receipt)
    revalidatePath('/account')
    revalidatePath(`/admin/students/${user.id}`)
  }
  let sent = false
  try {
    sent = await sendLeaveEmails(receipt)
  } catch {
    /* Keep the recorded request and offer a bounded retry. */
  }
  return sent
    ? {
        success:
          'Your leave request was recorded. Confirmation emails were accepted for delivery to you and the Academy.',
        remaining: receipt.remaining,
      }
    : {
        warning:
          'Your leave request was recorded, but one or both emails could not be confirmed. Retry emails below without using another leave request. Keep this page open until the retry succeeds.',
        retryToken: token,
        remaining: receipt.remaining,
      }
}
