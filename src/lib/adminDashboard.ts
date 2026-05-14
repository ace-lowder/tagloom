import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAdminSortOrDefault,
  type AdminSortState,
} from "@/lib/adminTable";
import { getAdminRangeStart, type AdminRange } from "@/lib/adminRange";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

type DashboardResult<T> =
  | { ok: true; configured: true; data: T }
  | { ok: false; configured: false; error: string; data: T };

type SupportMessageRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string;
  subject: string;
  message: string;
  status: "pending" | "sent" | "failed";
  resend_message_id: string | null;
  error_message: string | null;
  email_domain: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

type GenerationFeedbackRow = {
  id: string;
  user_id: string;
  generation_id: string;
  rating: "up" | "down";
  note: string | null;
  title_snapshot: string;
  created_at: string;
};

type SupportArticleFeedbackRow = {
  id: string;
  user_id: string;
  article_slug: string;
  rating: "up" | "down";
  note: string | null;
  created_at: string;
};

type ErrorRow = {
  id: string;
  user_id: string | null;
  source: string;
  route: string | null;
  method: string | null;
  status: number | null;
  code: string | null;
  message: string;
  stack: string | null;
  metadata: unknown;
  created_at: string;
};

type GenerationRow = {
  id: string;
  user_id: string;
  title: string;
  source: string;
  entitlement_used: string;
  created_at: string;
};

export type CountByLabel = { label: string; count: number };
export type AdminSupabaseSort = { column: string; direction: "asc" | "desc" };

export type UsageSortKey =
  | "created_at"
  | "title"
  | "source"
  | "entitlement_used";
export type EntitlementSortKey = "label" | "count";
export type GenerationFeedbackSortKey =
  | "created_at"
  | "rating"
  | "title_snapshot"
  | "note";
export type SupportArticleFeedbackSortKey =
  | "created_at"
  | "rating"
  | "article_slug"
  | "note";
export type SupportMessageSortKey =
  | "created_at"
  | "status"
  | "email"
  | "name"
  | "subject"
  | "message";
export type ErrorLogSortKey =
  | "created_at"
  | "source"
  | "route"
  | "method"
  | "status"
  | "code"
  | "message";
export type EnvStatusSortKey = "key" | "configured";

export type AdminChartBucket = {
  label: string;
  signups: number;
  generations: number;
  free: number;
  paid: number;
};

export type AdminMetricComparison = {
  current: number;
  previous: number;
  delta: number;
  percentChange: number;
};

export type AdminComparison = {
  signups: AdminMetricComparison;
  feedback: AdminMetricComparison;
  messages: AdminMetricComparison;
  errors: AdminMetricComparison;
} | null;

export type OverviewData = {
  counts: {
    signups: number;
    feedback: number;
    messages: number;
    errors: number;
  };
  comparison: AdminComparison;
  signupChart: AdminChartBucket[];
  generationChart: AdminChartBucket[];
  externalLinks: ExternalLinks;
};

export type UsageData = {
  byEntitlement: CountByLabel[];
  recentGenerations: GenerationRow[];
};

export type FeedbackData = {
  generationFeedback: GenerationFeedbackRow[];
  supportArticleFeedback: SupportArticleFeedbackRow[];
};

export type SupportData = {
  supportMessages: SupportMessageRow[];
};

export type HealthData = {
  env: Array<{ key: string; configured: boolean }>;
  errorLogs: ErrorRow[];
};

type ExternalLinks = {
  supabase: string;
  stripe: string;
  googleAnalytics: string;
  vercel: string;
  openai: string;
};

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

type ChartMode = "24h" | "7d" | "30d";

function chartModeForRange(range: AdminRange): ChartMode {
  if (range === "1d") return "24h";
  if (range === "7d") return "7d";
  return "30d";
}

export function getChartBucketCount(range: AdminRange): number {
  if (range === "1d") return 24;
  if (range === "7d") return 7;
  return 30;
}

function buildChartBuckets(range: AdminRange, now = new Date()): AdminChartBucket[] {
  const mode = chartModeForRange(range);
  const count = getChartBucketCount(range);
  const buckets: AdminChartBucket[] = [];

  if (mode === "24h") {
    const endHour = new Date(now);
    endHour.setMinutes(0, 0, 0);

    for (let index = count - 1; index >= 0; index -= 1) {
      const date = new Date(endHour.getTime() - index * MS_HOUR);
      buckets.push({
        label: String(date.getHours()),
        signups: 0,
        generations: 0,
        free: 0,
        paid: 0,
      });
    }

    return buckets;
  }

  const endDay = new Date(now);
  endDay.setHours(0, 0, 0, 0);

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(endDay.getTime() - index * MS_DAY);
    buckets.push({
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      signups: 0,
      generations: 0,
      free: 0,
      paid: 0,
    });
  }

  return buckets;
}

function chartKeyForDate(iso: string, mode: ChartMode): string {
  const date = new Date(iso);
  if (mode === "24h") {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  }
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function chartKeyForBucketIndex(index: number, range: AdminRange, now: Date): string {
  const mode = chartModeForRange(range);

  if (mode === "24h") {
    const endHour = new Date(now);
    endHour.setMinutes(0, 0, 0);
    const bucketTime = new Date(endHour.getTime() - (getChartBucketCount(range) - 1 - index) * MS_HOUR);
    return `${bucketTime.getFullYear()}-${bucketTime.getMonth()}-${bucketTime.getDate()}-${bucketTime.getHours()}`;
  }

  const endDay = new Date(now);
  endDay.setHours(0, 0, 0, 0);
  const bucketTime = new Date(endDay.getTime() - (getChartBucketCount(range) - 1 - index) * MS_DAY);
  return `${bucketTime.getFullYear()}-${bucketTime.getMonth()}-${bucketTime.getDate()}`;
}

export function buildOverviewCharts(
  range: AdminRange,
  signups: Array<{ created_at: string }>,
  generations: Array<{ created_at: string; entitlement_used: string | null }>,
  now = new Date(),
): { signupChart: AdminChartBucket[]; generationChart: AdminChartBucket[] } {
  const signupChart = buildChartBuckets(range, now);
  const generationChart = buildChartBuckets(range, now);
  const bucketMap = new Map<string, number>();

  for (let index = 0; index < signupChart.length; index += 1) {
    bucketMap.set(chartKeyForBucketIndex(index, range, now), index);
  }

  const mode = chartModeForRange(range);

  for (const row of signups) {
    const index = bucketMap.get(chartKeyForDate(row.created_at, mode));
    if (index === undefined) continue;
    signupChart[index].signups += 1;
  }

  for (const row of generations) {
    const index = bucketMap.get(chartKeyForDate(row.created_at, mode));
    if (index === undefined) continue;

    generationChart[index].generations += 1;
    if ((row.entitlement_used ?? "").toLowerCase() === "free") {
      generationChart[index].free += 1;
    } else {
      generationChart[index].paid += 1;
    }
  }

  return { signupChart, generationChart };
}

function safePreview(value: string | null | undefined, max = 140) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

async function countRows(
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

async function countRowsBetween(
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

async function fetchRows<T>(
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

function notConfiguredResult<T>(data: T): DashboardResult<T> {
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

function getExternalLinks(): ExternalLinks {
  return {
    supabase: getSupabaseDashboardLink(process.env.NEXT_PUBLIC_SUPABASE_URL),
    stripe: "https://dashboard.stripe.com/",
    googleAnalytics: "https://analytics.google.com/analytics/web/",
    vercel: "https://vercel.com/dashboard",
    openai: "https://platform.openai.com/usage",
  };
}

function getEffectiveRange(range: AdminRange): AdminRange {
  return range === "all" ? "30d" : range;
}

export async function getAdminOverviewData(range: AdminRange): Promise<DashboardResult<OverviewData>> {
  const fallback: OverviewData = {
    counts: { signups: 0, feedback: 0, messages: 0, errors: 0 },
    comparison: null,
    signupChart: buildChartBuckets(getEffectiveRange(range)),
    generationChart: buildChartBuckets(getEffectiveRange(range)),
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
    fetchRows<{ created_at: string }>(admin, "profiles", "created_at", 2000, chartRangeStart),
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

export function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function previewText(value: string | null | undefined, max = 140) {
  return safePreview(value, max);
}
