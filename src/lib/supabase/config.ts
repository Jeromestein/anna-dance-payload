const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(
    supabaseUrl &&
      supabasePublishableKey &&
      !supabaseUrl.includes("your-project-ref") &&
      !supabasePublishableKey.includes("your_key"),
  );
}

export function getSupabaseConfig() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase Auth is not configured.");
  }

  return {
    url: supabaseUrl as string,
    publishableKey: supabasePublishableKey as string,
  };
}
