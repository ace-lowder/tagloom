import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const STARTER_GENERATION_CREDITS = 5;

export const STRIPE_EVENT_STATUS = {
  processing: "processing",
  processed: "processed",
  failed: "failed",
} as const;

export type AdminClient = ReturnType<typeof createSupabaseAdminClient>;
