import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAdminSortOrDefault,
  type AdminSortState,
} from "@/lib/adminTable";
import { getAdminRangeStart, type AdminRange } from "@/lib/adminRange";
import { fetchRows, notConfiguredResult, type DashboardResult } from "./dashboardShared";
import type {
  CountByLabel,
  EntitlementSortKey,
  GenerationRow,
  UsageData,
  UsageSortKey,
} from "./dashboardTypes";

function aggregateCounts(rows: GenerationRow[], field: "entitlement_used"): CountByLabel[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row[field] || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function sortEntitlementCounts(
  rows: CountByLabel[],
  sort: { key: EntitlementSortKey; direction: "asc" | "desc" },
) {
  return [...rows].sort((a, b) => {
    if (sort.key === "count") {
      return sort.direction === "asc" ? a.count - b.count : b.count - a.count;
    }

    const result = a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
    return sort.direction === "asc" ? result : -result;
  });
}

export async function getAdminUsageData(
  range: AdminRange,
  generationSort: AdminSortState<UsageSortKey> = null,
  entitlementSort: AdminSortState<EntitlementSortKey> = null,
): Promise<DashboardResult<UsageData>> {
  const fallback: UsageData = { byEntitlement: [], recentGenerations: [] };

  const admin = createSupabaseAdminClient();
  if (!admin) return notConfiguredResult(fallback);

  const rangeStart = getAdminRangeStart(range);
  const effectiveGenerationSort = getAdminSortOrDefault(generationSort, {
    key: "created_at",
    direction: "desc",
  });
  const effectiveEntitlementSort = getAdminSortOrDefault(entitlementSort, {
    key: "count",
    direction: "desc",
  });
  const recentGenerations = await fetchRows<GenerationRow>(
    admin,
    "generations",
    "id,user_id,title,source,entitlement_used,created_at",
    50,
    rangeStart,
    [],
    { column: effectiveGenerationSort.key, direction: effectiveGenerationSort.direction },
  );
  const byEntitlement = sortEntitlementCounts(
    aggregateCounts(recentGenerations, "entitlement_used"),
    effectiveEntitlementSort,
  );

  return {
    ok: true,
    configured: true,
    data: {
      byEntitlement,
      recentGenerations,
    },
  };
}
