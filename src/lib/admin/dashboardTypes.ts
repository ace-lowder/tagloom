import type { AdminSortState } from "@/lib/adminTable";

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

export type ExternalLinks = {
  supabase: string;
  stripe: string;
  googleAnalytics: string;
  vercel: string;
  openai: string;
};

export type SupportMessageRow = {
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

export type GenerationFeedbackRow = {
  id: string;
  user_id: string;
  generation_id: string;
  rating: "up" | "down";
  note: string | null;
  title_snapshot: string;
  created_at: string;
};

export type SupportArticleFeedbackRow = {
  id: string;
  user_id: string;
  article_slug: string;
  rating: "up" | "down";
  note: string | null;
  created_at: string;
};

export type ErrorRow = {
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

export type GenerationRow = {
  id: string;
  user_id: string;
  title: string;
  source: string;
  entitlement_used: string;
  created_at: string;
};

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

export type SortStateOrNull<T extends string> = AdminSortState<T>;
