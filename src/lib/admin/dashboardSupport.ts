import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAdminSortOrDefault,
  type AdminSortState,
} from "@/lib/adminTable";
import { getAdminRangeStart, type AdminRange } from "@/lib/adminRange";
import { fetchRows, notConfiguredResult, type DashboardResult } from "./dashboardShared";
import type {
  SupportData,
  SupportMessageRow,
  SupportMessageSortKey,
} from "./dashboardTypes";

export async function getAdminSupportData(
  range: AdminRange,
  sort: AdminSortState<SupportMessageSortKey> = null,
): Promise<DashboardResult<SupportData>> {
  const fallback: SupportData = { supportMessages: [] };

  const admin = createSupabaseAdminClient();
  if (!admin) return notConfiguredResult(fallback);

  const rangeStart = getAdminRangeStart(range);
  const effectiveSort = getAdminSortOrDefault(sort, {
    key: "created_at",
    direction: "desc",
  });
  const supportMessages = await fetchRows<SupportMessageRow>(
    admin,
    "support_messages",
    "id,user_id,name,email,subject,message,status,resend_message_id,error_message,email_domain,ip_address,user_agent,created_at,updated_at",
    50,
    rangeStart,
    [],
    { column: effectiveSort.key, direction: effectiveSort.direction },
  );

  return {
    ok: true,
    configured: true,
    data: { supportMessages },
  };
}
