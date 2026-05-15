import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAdminRangeStart, type AdminRange } from "@/lib/adminRange";
import { buildOverviewCharts } from "./dashboardCharts";
import {
  countRows,
  countRowsBetween,
  fetchRows,
  getEffectiveRange,
  getExternalLinks,
  notConfiguredResult,
  type DashboardResult,
} from "./dashboardShared";
import type { AdminComparison, AdminMetricComparison, OverviewData } from "./dashboardTypes";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

export function getAdminComparisonWindow(range: AdminRange, now = new Date()) {
  if (range === "all") return null;

  const durationMs =
    range === "1d" ? MS_DAY : range === "7d" ? 7 * MS_DAY : 30 * MS_DAY;

  const currentEnd = new Date(now);
  const currentStart = new Date(currentEnd.getTime() - durationMs);
  const previousEnd = currentStart;
  const previousStart = new Date(previousEnd.getTime() - durationMs);

  return {
    currentStart: currentStart.toISOString(),
    currentEnd: currentEnd.toISOString(),
    previousStart: previousStart.toISOString(),
    previousEnd: previousEnd.toISOString(),
  };
}

export function calculateAdminMetricComparison(
  current: number,
  previous: number,
): AdminMetricComparison {
  const delta = current - previous;
  let percentChange = 0;

  if (previous === 0) {
    percentChange = current === 0 ? 0 : 100;
  } else {
    percentChange = Math.round((delta / previous) * 100);
  }

  return {
    current,
    previous,
    delta,
    percentChange,
  };
}

export async function getAdminOverviewData(
  range: AdminRange,
): Promise<DashboardResult<OverviewData>> {
  const fallback: OverviewData = {
    counts: { signups: 0, feedback: 0, messages: 0, errors: 0 },
    comparison: null,
    signupChart: buildOverviewCharts(getEffectiveRange(range), [], []).signupChart,
    generationChart: buildOverviewCharts(getEffectiveRange(range), [], []).generationChart,
    externalLinks: getExternalLinks(),
  };

  const admin = createSupabaseAdminClient();
  if (!admin) return notConfiguredResult(fallback);

  const rangeStart = getAdminRangeStart(range);
  const comparisonWindow = getAdminComparisonWindow(range);
  const chartRange = getEffectiveRange(range);
  const chartRangeStart = getAdminRangeStart(chartRange)!;

  const [
    signups,
    generationFeedback,
    supportArticleFeedback,
    supportMessages,
    errorLogs,
    chartSignupRows,
    chartGenerationRows,
  ] = await Promise.all([
    countRows(admin, "profiles", rangeStart),
    countRows(admin, "generation_feedback", rangeStart),
    countRows(admin, "support_article_feedback", rangeStart),
    countRows(admin, "support_messages", rangeStart),
    countRows(admin, "error_logs", rangeStart),
    fetchRows<{ created_at: string }>(
      admin,
      "profiles",
      "created_at",
      2000,
      chartRangeStart,
    ),
    fetchRows<{ created_at: string; entitlement_used: string | null }>(
      admin,
      "generations",
      "created_at,entitlement_used",
      5000,
      chartRangeStart,
    ),
  ]);

  const charts = buildOverviewCharts(chartRange, chartSignupRows, chartGenerationRows);
  let comparison: AdminComparison = null;

  if (comparisonWindow) {
    const [
      signupsCurrent,
      signupsPrevious,
      generationFeedbackCurrent,
      generationFeedbackPrevious,
      supportFeedbackCurrent,
      supportFeedbackPrevious,
      supportMessagesCurrent,
      supportMessagesPrevious,
      errorLogsCurrent,
      errorLogsPrevious,
    ] = await Promise.all([
      countRowsBetween(
        admin,
        "profiles",
        comparisonWindow.currentStart,
        comparisonWindow.currentEnd,
      ),
      countRowsBetween(
        admin,
        "profiles",
        comparisonWindow.previousStart,
        comparisonWindow.previousEnd,
      ),
      countRowsBetween(
        admin,
        "generation_feedback",
        comparisonWindow.currentStart,
        comparisonWindow.currentEnd,
      ),
      countRowsBetween(
        admin,
        "generation_feedback",
        comparisonWindow.previousStart,
        comparisonWindow.previousEnd,
      ),
      countRowsBetween(
        admin,
        "support_article_feedback",
        comparisonWindow.currentStart,
        comparisonWindow.currentEnd,
      ),
      countRowsBetween(
        admin,
        "support_article_feedback",
        comparisonWindow.previousStart,
        comparisonWindow.previousEnd,
      ),
      countRowsBetween(
        admin,
        "support_messages",
        comparisonWindow.currentStart,
        comparisonWindow.currentEnd,
      ),
      countRowsBetween(
        admin,
        "support_messages",
        comparisonWindow.previousStart,
        comparisonWindow.previousEnd,
      ),
      countRowsBetween(
        admin,
        "error_logs",
        comparisonWindow.currentStart,
        comparisonWindow.currentEnd,
      ),
      countRowsBetween(
        admin,
        "error_logs",
        comparisonWindow.previousStart,
        comparisonWindow.previousEnd,
      ),
    ]);

    comparison = {
      signups: calculateAdminMetricComparison(signupsCurrent, signupsPrevious),
      feedback: calculateAdminMetricComparison(
        generationFeedbackCurrent + supportFeedbackCurrent,
        generationFeedbackPrevious + supportFeedbackPrevious,
      ),
      messages: calculateAdminMetricComparison(
        supportMessagesCurrent,
        supportMessagesPrevious,
      ),
      errors: calculateAdminMetricComparison(errorLogsCurrent, errorLogsPrevious),
    };
  }

  return {
    ok: true,
    configured: true,
    data: {
      counts: {
        signups,
        feedback: generationFeedback + supportArticleFeedback,
        messages: supportMessages,
        errors: errorLogs,
      },
      comparison,
      signupChart: charts.signupChart,
      generationChart: charts.generationChart,
      externalLinks: getExternalLinks(),
    },
  };
}
