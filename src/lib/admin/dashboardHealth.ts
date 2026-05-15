import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAdminSortOrDefault,
  type AdminSortState,
} from "@/lib/adminTable";
import { getAdminRangeStart, type AdminRange } from "@/lib/adminRange";
import { fetchRows, notConfiguredResult, type DashboardResult } from "./dashboardShared";
import type { EnvStatusSortKey, ErrorLogSortKey, ErrorRow, HealthData } from "./dashboardTypes";

export function sortEnvStatusRows(
  rows: Array<{ key: string; configured: boolean }>,
  envSort: { key: EnvStatusSortKey; direction: "asc" | "desc" },
) {
  return [...rows].sort((a, b) => {
    if (envSort.key === "configured") {
      const aValue = a.configured ? 1 : 0;
      const bValue = b.configured ? 1 : 0;
      return envSort.direction === "asc" ? aValue - bValue : bValue - aValue;
    }

    return envSort.direction === "asc"
      ? a.key.localeCompare(b.key)
      : b.key.localeCompare(a.key);
  });
}

export async function getAdminHealthData(
  range: AdminRange,
  errorSort: AdminSortState<ErrorLogSortKey> = null,
  envSort: AdminSortState<EnvStatusSortKey> = null,
): Promise<DashboardResult<HealthData>> {
  const fallback: HealthData = {
    env: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "RESEND_API_KEY",
      "SUPPORT_FROM_EMAIL",
      "SUPPORT_TO_EMAIL",
      "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    ].map((key) => ({ key, configured: Boolean(process.env[key]) })),
    errorLogs: [],
  };

  const admin = createSupabaseAdminClient();
  if (!admin) return notConfiguredResult(fallback);

  const rangeStart = getAdminRangeStart(range);
  const effectiveErrorSort = getAdminSortOrDefault(errorSort, {
    key: "created_at",
    direction: "desc",
  });
  const effectiveEnvSort = getAdminSortOrDefault(envSort, {
    key: "key",
    direction: "asc",
  });
  const errorLogs = await fetchRows<ErrorRow>(
    admin,
    "error_logs",
    "id,user_id,source,route,method,status,code,message,stack,metadata,created_at",
    50,
    rangeStart,
    [],
    { column: effectiveErrorSort.key, direction: effectiveErrorSort.direction },
  );

  const env = sortEnvStatusRows(fallback.env, effectiveEnvSort);

  return {
    ok: true,
    configured: true,
    data: { ...fallback, env, errorLogs },
  };
}
