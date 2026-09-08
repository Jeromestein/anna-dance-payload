import { createClient } from '@/lib/supabase/server'
import { notifyGoogleRegistration } from '@/lib/email/google-registration-notification.server'

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return new Response(null, { status: 403 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return new Response(null, { status: 401 })

    await notifyGoogleRegistration(data.user.id)
  } catch {
    console.error('Registration notification authentication check failed.')
  }

  return new Response(null, { status: 204 })
}
