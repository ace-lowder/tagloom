"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;
  return { supabaseUrl, supabaseAnonKey };
}

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const env = getSupabaseEnv();
  if (!env) return null;

  const { supabaseUrl, supabaseAnonKey } = env;
  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
