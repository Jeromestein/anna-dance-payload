import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

type BrowserClientOptions = {
  detectSessionInUrl?: boolean;
};

export function createClient(options: BrowserClientOptions = {}) {
  const { url, publishableKey } = getSupabaseConfig();

  return createBrowserClient(url, publishableKey, {
    auth: {
      detectSessionInUrl: options.detectSessionInUrl ?? true,
    },
  });
}
