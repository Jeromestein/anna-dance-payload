import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeaveCourse, LeaveData } from './model'

export async function loadStudentLeave(client: SupabaseClient, owner: string): Promise<LeaveData> {
  const result = await client.rpc('app_student_leave_courses', { p_owner: owner })
  if (result.error || !Array.isArray(result.data) || result.data.length >= 1000)
    return { courses: [], unavailable: true }
  return { courses: result.data as LeaveCourse[] }
}
