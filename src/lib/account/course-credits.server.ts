import 'server-only'
import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CourseCreditData, CourseBalance, ManagedLesson } from './course-credits'
export async function loadCourseCredits(
  client: SupabaseClient,
  owner: string,
  test = false,
): Promise<CourseCreditData> {
  const result = await client.rpc('app_course_balances', { p_owner: owner, p_test: test })
  if (result.error || !result.data || result.data.length >= 1000)
    return { balances: [], lessons: [], unavailable: true, test }
  const balances = (result.data as CourseBalance[]).map((balance) => ({
    ...balance,
    request_id: randomUUID(),
  }))
  if (!balances.length) return { balances, lessons: [], unavailable: false, test }
  const lessons = await client
    .from('app_schedule_entries')
    .select('id,payment_item_id,starts_at,ends_at,location,status,revision,source', {
      count: 'exact',
    })
    .in(
      'payment_item_id',
      balances.map((b) => b.item_id),
    )
    .order('starts_at', { ascending: false })
    .limit(500)
  return {
    balances,
    lessons: (lessons.data ?? []) as ManagedLesson[],
    unavailable: Boolean(lessons.error) || (lessons.count ?? 0) > (lessons.data?.length ?? 0),
    test,
  }
}
