import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey };
}

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const env = getSupabaseEnv();
  if (!env) return null;

  const { supabaseUrl, supabaseAnonKey } = env;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const cookie of cookiesToSet) {
            cookieStore.set(cookie.name, cookie.value, cookie.options);
          }
        } catch {
          // Server Components can read cookies during SSR, but writes may be rejected.
        }
      },
    },
  });
}
