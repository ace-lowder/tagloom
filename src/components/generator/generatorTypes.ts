import type { RefObject } from "react";
import type { FeedbackRating } from "@/components/feedback/FeedbackButtons";
import type {
  GenerationHistoryItem,
  HistoryMode,
  HistorySortState,
} from "./HistoryPanel";

// === Types ===

export type GeneratorProps = {
  onFocus?: () => void;
  glowRef?: RefObject<HTMLDivElement>;
  demoConfig?: {
    timings?: Partial<DemoTimings>;
    fixtures?: DemoFixture[];
  };
};

export type GenerateOkResponse = {
  status: "ok";
  requestId: string | null;
  generationId: string;
  tags: {
    target: string[];
    discovery: string[];
  };
  source: "model" | "fallback";
  entitlementUsed:
    | "free_credit"
    | "single_use"
    | "subscription_monthly"
    | "subscription_yearly";
};

export type GeneratePaywallResponse = {
  status: "paywall";
  reason: "auth_required" | "payment_required" | "limit_reached";
  requestId: string | null;
  message: string;
  placeholders: {
    target: string[];
    discovery: string[];
  };
};

export type GenerateResponse = GenerateOkResponse | GeneratePaywallResponse;

export type AccountUsageResponse = {
  usageLabel: string | null;
  monthlyResetAt?: string | null;
};

export type GenerationHistoryResponse = {
  items: GenerationHistoryItem[];
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
};

export type GenerationFeedback = { rating: FeedbackRating; note: string | null };

export type DraftHistoryState = {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
};

export type HistoryCache = {
  generatedItems: GenerationHistoryItem[];
  activeGeneratedItems?: GenerationHistoryItem[];
  selectedGeneratedId: string | null;
  drafts: DraftHistoryState[];
  selectedDraftId: string | null;
  mode: HistoryMode;
  sortState: HistorySortState;
  showArchived: boolean;
  savedAt: number;
};

export type LegacyHistoryCache = Partial<HistoryCache> & {
  page0?: GenerationHistoryItem[];
  selectedId?: string | null;
  draft?: Partial<DraftHistoryState> | null;
};

export type PaywallState = {
  reason: "auth_required" | "payment_required" | "limit_reached";
  message: string;
  requestId: string | null;
};

export type PendingContext = {
  id: string;
  title: string;
  description: string;
};

export type PendingGuestGeneration = {
  kind: "guest_generation";
  id: string;
  title: string;
  description: string;
  createdAt: number;
};

export type HistoryConfirmAction =
  | { type: "delete-draft"; item: GenerationHistoryItem }
  | { type: "archive-generation"; item: GenerationHistoryItem }
  | { type: "restore-generation"; item: GenerationHistoryItem };

export type DemoPhase = "typing" | "generating" | "revealing" | "clearing";
export type ClearPhase = "idle" | "fading" | "collapsing";
export type DescriptionRevealMode = "idle" | "first-focus" | "none";

export type DemoFixture = {
  title: string;
  tags: {
    target: string[];
    discovery: string[];
  };
};

export type DemoTimings = {
  typingStartDelayMs: number;
  typingCharMs: number;
  generatingDelayMs: number;
  generatingLoadMs: number;
  revealStepMs: number;
  revealTailMs: number;
  showDwellMs: number;
  clearFadeMs: number;
  clearCollapseMs: number;
  backspaceCharMs: number;
  cyclePauseMs: number;
};

export type TimerMeta = {
  callback: (() => void) | null;
  delayMs: number;
  remainingMs: number;
  startedAtMs: number;
};
