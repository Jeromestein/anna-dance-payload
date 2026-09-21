'use server'
import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requirePayloadAdministrator } from '@/lib/staff/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { newYorkInstant } from '@/lib/account/course-credits'
import { stripeSettings } from '@/lib/stripe/config'

export type ScheduleActionState = { error?: string; success?: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const scheduleErrors: Record<string, string> = {
  'Student already has a lesson at this time':
    'Time conflict: this student already has a lesson or appointment during this slot. Choose another start time or date.',
  'Choose a future lesson time': 'Choose a start time in the future.',
  'No lesson credits available':
    'No credits remain for this course. Refresh to see the latest balance.',
  'Lesson changed; refresh before editing':
    'This lesson was changed by another administrator. Refresh before editing it again.',
  'Course payment needs verification before scheduling':
    'This payment or refund needs verification before you can schedule a lesson.',
  'This lesson is already resolved':
    'This lesson is already cancelled or completed. Refresh the calendar.',
}
export async function manageCourseSchedule(
  _: ScheduleActionState,
  form: FormData,
): Promise<ScheduleActionState> {
  const staff = await requirePayloadAdministrator()
  const owner = String(form.get('owner') ?? '')
  const item = String(form.get('item') ?? '')
  const operation = String(form.get('operation') ?? '')
  if (
    !uuid.test(owner) ||
    !uuid.test(item) ||
    !['create', 'reschedule', 'cancel', 'complete'].includes(operation)
  )
    return { error: 'Invalid course reference.' }
  try {
    const test = form.get('test') === 'yes'
    if (test && stripeSettings().mode !== 'test')
      return { error: 'Sandbox scheduling is unavailable in live mode.' }
    const location = String(form.get('location') ?? '').trim()
    if (location.length > 200) return { error: 'Keep the location under 200 characters.' }
    let entries: Record<string, unknown>[]
    if (operation === 'create') {
      const request = String(form.get('request') ?? '')
      if (!uuid.test(request)) return { error: 'Refresh the scheduling form.' }
      const startsAt = newYorkInstant(String(form.get('local') ?? ''))
      const hash = createHash('sha256').update(`${request}:0`).digest('hex')
      const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
      entries = [{ id, starts_at: startsAt, location }]
    } else {
      const id = String(form.get('lesson') ?? '')
      const revision = Number(form.get('revision'))
      if (!uuid.test(id) || !Number.isInteger(revision) || revision < 0)
        return { error: 'Refresh the lesson before editing.' }
      entries = [
        {
          id,
          revision,
          location,
          reason: String(form.get('reason') ?? '').trim(),
          ...(operation === 'reschedule'
            ? { starts_at: newYorkInstant(String(form.get('local') ?? '')) }
            : {}),
        },
      ]
    }
    const { error } = await createSupabaseAdminClient().rpc('app_manage_course_schedule', {
      p_owner: owner,
      p_item: item,
      p_actor: String(staff.id),
      p_operation: operation,
      p_entries: entries,
      p_test: test,
    })
    if (error)
      return {
        error:
          scheduleErrors[error.message] ??
          'Could not save this lesson. Refresh the calendar and try again. No changes were saved.',
      }
    revalidatePath('/account')
    revalidatePath(`/admin/students/${owner}`)
    revalidatePath('/admin/appointments')
    return {
      success:
        operation === 'cancel'
          ? 'Lesson cancelled. Its reservation has been released.'
          : 'Lesson schedule saved.',
    }
  } catch (error) {
    return {
      error:
        error instanceof Error &&
        /^(Enter|This New York|Use YYYY|A skipped|Keep at least)/.test(error.message)
          ? error.message
          : 'Scheduling is unavailable. Check the configuration and try again.',
    }
  }
}
