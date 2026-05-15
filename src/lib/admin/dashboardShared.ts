import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminRange } from "@/lib/adminRange";
import type { AdminSupabaseSort, ExternalLinks } from "./dashboardTypes";

export type DashboardResult<T> =
  | { ok: true; configured: true; data: T }
  | { ok: false; configured: false; error: string; data: T };

export async function countRows(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  table: string,
  rangeStart: string | null,
  filters: Array<{ column: string; value: string }> = [],
): Promise<number> {
  let query = admin.from(table).select("id", { count: "exact", head: true });
  if (rangeStart) query = query.gte("created_at", rangeStart);
  for (const filter of filters) query = query.eq(filter.column, filter.value);
  const { count } = await query;
  return count ?? 0;
}

export async function countRowsBetween(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  table: string,
  start: string,
  end: string,
  filters: Array<{ column: string; value: string }> = [],
): Promise<number> {
  let query = admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("created_at", start)
    .lt("created_at", end);
  for (const filter of filters) query = query.eq(filter.column, filter.value);
  const { count } = await query;
  return count ?? 0;
}

export async function fetchRows<T>(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  table: string,
  columns: string,
  limit: number,
  rangeStart: string | null,
  filters: Array<{ column: string; value: string }> = [],
  sort: AdminSupabaseSort = { column: "created_at", direction: "desc" },
): Promise<T[]> {
  let query = admin
    .from(table)
    .select(columns)
    .order(sort.column, { ascending: sort.direction === "asc" });
  if (rangeStart) query = query.gte("created_at", rangeStart);
  for (const filter of filters) query = query.eq(filter.column, filter.value);
  const { data } = await query.limit(limit);
  return (data as T[] | null) ?? [];
}

export function notConfiguredResult<T>(data: T): DashboardResult<T> {
  return {
    ok: false,
    configured: false,
    error: "Supabase admin client is not configured.",
    data,
  };
}

export function getSupabaseDashboardLink(supabaseUrl?: string | null): string {
  if (!supabaseUrl) return "https://supabase.com/dashboard";

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const projectRef = hostname.split(".")[0];
    if (!projectRef) return "https://supabase.com/dashboard";
    return `https://supabase.com/dashboard/project/${projectRef}`;
  } catch {
    return "https://supabase.com/dashboard";
  }
}

export function getExternalLinks(): ExternalLinks {
  return {
    supabase: getSupabaseDashboardLink(process.env.NEXT_PUBLIC_SUPABASE_URL),
    stripe: "https://dashboard.stripe.com/",
    googleAnalytics: "https://analytics.google.com/analytics/web/",
    vercel: "https://vercel.com/dashboard",
    openai: "https://platform.openai.com/usage",
  };
}

export function getEffectiveRange(range: AdminRange): AdminRange {
  return range === "all" ? "30d" : range;
}

export function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function safePreview(value: string | null | undefined, max = 140) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

export function previewText(value: string | null | undefined, max = 140) {
  return safePreview(value, max);
}
