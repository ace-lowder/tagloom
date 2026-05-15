import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAdminSortOrDefault,
  type AdminSortState,
} from "@/lib/adminTable";
import { getAdminRangeStart, type AdminRange } from "@/lib/adminRange";
import { fetchRows, notConfiguredResult, type DashboardResult } from "./dashboardShared";
import type {
  FeedbackData,
  GenerationFeedbackRow,
  GenerationFeedbackSortKey,
  SupportArticleFeedbackRow,
  SupportArticleFeedbackSortKey,
} from "./dashboardTypes";

export async function getAdminFeedbackData(
  range: AdminRange,
  generationFeedbackSort: AdminSortState<GenerationFeedbackSortKey> = null,
  supportArticleFeedbackSort: AdminSortState<SupportArticleFeedbackSortKey> = null,
): Promise<DashboardResult<FeedbackData>> {
  const fallback: FeedbackData = { generationFeedback: [], supportArticleFeedback: [] };

  const admin = createSupabaseAdminClient();
  if (!admin) return notConfiguredResult(fallback);

  const rangeStart = getAdminRangeStart(range);
  const effectiveGenerationSort = getAdminSortOrDefault(generationFeedbackSort, {
    key: "created_at",
    direction: "desc",
  });
  const effectiveArticleSort = getAdminSortOrDefault(supportArticleFeedbackSort, {
    key: "created_at",
    direction: "desc",
  });
  const [generationFeedback, supportArticleFeedback] = await Promise.all([
    fetchRows<GenerationFeedbackRow>(
      admin,
      "generation_feedback",
      "id,user_id,generation_id,rating,note,title_snapshot,created_at",
      50,
      rangeStart,
      [],
      { column: effectiveGenerationSort.key, direction: effectiveGenerationSort.direction },
    ),
    fetchRows<SupportArticleFeedbackRow>(
      admin,
      "support_article_feedback",
      "id,user_id,article_slug,rating,note,created_at",
      50,
      rangeStart,
      [],
      { column: effectiveArticleSort.key, direction: effectiveArticleSort.direction },
    ),
  ]);

  return {
    ok: true,
    configured: true,
    data: { generationFeedback, supportArticleFeedback },
  };
}
