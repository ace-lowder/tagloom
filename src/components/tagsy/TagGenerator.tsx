"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Copy, Info, LockOpen, Sparkles, X } from "lucide-react";
import { useAuthController } from "@/components/auth/AuthController";
import TurnstileField, { type TurnstileFieldHandle } from "@/components/security/TurnstileField";
import { AUTH_SUCCESS_EVENT } from "@/lib/authModal";
import { GENERATOR_CTA_EVENT } from "@/lib/generatorCta";
import GradientBackground from "./GradientBackground";

type TagGeneratorProps = {
  onFocus?: () => void;
  glowRef?: RefObject<HTMLDivElement>;
  demoConfig?: {
    timings?: Partial<DemoTimings>;
    fixtures?: DemoFixture[];
  };
};

type GenerateOkResponse = {
  status: "ok";
  requestId: string | null;
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

type GeneratePaywallResponse = {
  status: "paywall";
  reason: "auth_required" | "payment_required" | "limit_reached";
  requestId: string | null;
  message: string;
  placeholders: {
    target: string[];
    discovery: string[];
  };
};

type GenerateResponse = GenerateOkResponse | GeneratePaywallResponse;
type AccountUsageResponse = {
  usageLabel: string | null;
  monthlyResetAt?: string | null;
};
type GenerationHistoryItem = {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  targetTags: string[];
  discoveryTags: string[];
  isDraft?: boolean;
};
type GenerationHistoryResponse = {
  items: GenerationHistoryItem[];
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
};

type PaywallState = {
  reason: "auth_required" | "payment_required" | "limit_reached";
  message: string;
  requestId: string | null;
};

type PendingContext = {
  id: string;
  title: string;
  description: string;
};

type DemoPhase = "typing" | "generating" | "revealing" | "clearing";
type ClearPhase = "idle" | "fading" | "collapsing";

type DemoFixture = {
  title: string;
  tags: {
    target: string[];
    discovery: string[];
  };
};

type DemoTimings = {
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

type TimerMeta = {
  callback: (() => void) | null;
  delayMs: number;
  remainingMs: number;
  startedAtMs: number;
};

const DEMO_FIXTURES: DemoFixture[] = [
  {
    title: "Handmade ceramic coffee mug with minimalist design",
    tags: {
      target: [
        "ceramic mug",
        "handmade pottery",
        "minimalist cup",
        "coffee lover gift",
        "artisan mug",
        "stoneware cup",
        "modern ceramic",
      ],
      discovery: [
        "pottery gift",
        "hand thrown mug",
        "unique coffee mug",
        "kitchen gift",
        "home decor",
        "cozy gift",
      ],
    },
  },
  {
    title: "Vintage floral pressed flower bookmark set",
    tags: {
      target: [
        "pressed flower",
        "floral bookmark",
        "book lover gift",
        "botanical art",
        "dried flowers",
        "vintage bookmark",
        "gift for reader",
      ],
      discovery: [
        "handmade bookmark",
        "nature art",
        "wildflower print",
        "stocking stuffer",
        "teacher gift",
        "cottagecore",
      ],
    },
  },
  {
    title: "Custom engraved wooden cutting board for kitchen",
    tags: {
      target: [
        "custom cutting board",
        "engraved wood",
        "personalized gift",
        "wedding gift",
        "kitchen decor",
        "wooden board",
        "housewarming gift",
      ],
      discovery: [
        "custom kitchen",
        "laser engraved",
        "anniversary gift",
        "rustic kitchen",
        "foodie gift",
        "bamboo board",
      ],
    },
  },
];
const DEFAULT_DEMO_TIMINGS: DemoTimings = {
  typingStartDelayMs: 700,
  typingCharMs: 45,
  generatingDelayMs: 450,
  generatingLoadMs: 1500,
  revealStepMs: 80,
  revealTailMs: 300,
  showDwellMs: 3500,
  clearFadeMs: 160,
  clearCollapseMs: 240,
  backspaceCharMs: 9,
  cyclePauseMs: 500,
};

const CONTEXT_STORAGE_PREFIX = "tagloom:genctx:";
const TITLE_MAX = 140;
const DESCRIPTION_MAX = 6000;
const DEFAULT_TITLE_PLACEHOLDER =
  "e.g. Handmade ceramic coffee mug with minimalist design";
const USAGE_HINT_CLOSE_DELAY_MS = 500;
const HISTORY_PAGE_SIZE = 4;
const HISTORY_TRANSITION_MS = 180;

function getContextStorageKey(id: string) {
  return `${CONTEXT_STORAGE_PREFIX}${id}`;
}

function generateContextId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function savePendingContext(context: PendingContext) {
  sessionStorage.setItem(getContextStorageKey(context.id), JSON.stringify(context));
}

function loadPendingContext(id: string): PendingContext | null {
  const raw = sessionStorage.getItem(getContextStorageKey(id));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingContext;
    if (!parsed?.id || !parsed?.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearPendingContext(id: string) {
  sessionStorage.removeItem(getContextStorageKey(id));
}

function sanitizeTags(tags: string[]) {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const rawTag of tags) {
    const tag = typeof rawTag === "string" ? rawTag.trim() : "";
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    cleaned.push(tag);
  }

  return cleaned;
}

function sanitizeMergedTags(target: string[], discovery: string[]) {
  return sanitizeTags([...target, ...discovery]);
}

function getUsageHintText(usageLabel: string | null, monthlyResetAt?: string | null) {
  if (!usageLabel) return null;
  const normalized = usageLabel.toLowerCase();

  if (normalized.includes("/100")) {
    if (monthlyResetAt) {
      return "Monthly includes 100 generations each billing period.";
    }
    return "Monthly includes 100 generations each billing period.";
  }
  if (normalized.includes("starter")) {
    return "Starter generations are prepaid and decrease as you generate.";
  }
  if (normalized.includes("free")) {
    return "New accounts get 1 free generation. You can purchase more generations in the pricing section.";
  }

  return null;
}

function ordinal(day: number) {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod10 === 1 && mod100 !== 11) return `${day}st`;
  if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatHistoryDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);
  const day = ordinal(date.getDate());
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

function truncateTitle(title: string, max = 30) {
  const clean = title.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export default function TagGenerator({ onFocus, glowRef, demoConfig }: TagGeneratorProps) {
  const { openAuthModal } = useAuthController();
  const turnstileRef = useRef<TurnstileFieldHandle | null>(null);
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  const [title, setTitle] = useState("");
  const [titlePlaceholder, setTitlePlaceholder] = useState(
    DEFAULT_TITLE_PLACEHOLDER,
  );
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [focusedField, setFocusedField] = useState<"title" | "description" | null>(null);

  const [apiTags, setApiTags] = useState<string[]>([]);
  const [visibleTags, setVisibleTags] = useState<string[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [entitlementUsed, setEntitlementUsed] = useState<string | null>(null);
  const [usageLabel, setUsageLabel] = useState<string | null>(null);
  const [monthlyResetAt, setMonthlyResetAt] = useState<string | null>(null);
  const [isUsageHintOpen, setIsUsageHintOpen] = useState(false);
  const [paywall, setPaywall] = useState<PaywallState | null>(null);
  const [isUnlockingFromPaywall, setIsUnlockingFromPaywall] = useState(false);
  const [unlockReadyContext, setUnlockReadyContext] = useState<PendingContext | null>(null);
  const [confirmModalMode, setConfirmModalMode] = useState<"unlock" | "generate" | null>(null);
  const [activeSheenId, setActiveSheenId] = useState<number | null>(null);
  const [generationContextId, setGenerationContextId] = useState<string | null>(null);
  const [isDemoActive, setIsDemoActive] = useState(true);
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("typing");
  const [clearPhase, setClearPhase] = useState<ClearPhase>("idle");
  const [shellHeightPx, setShellHeightPx] = useState<number | null>(null);
  const [shellHeightTransitionMs, setShellHeightTransitionMs] = useState(0);
  const [historyItems, setHistoryItems] = useState<GenerationHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyHasPrev, setHistoryHasPrev] = useState(false);
  const [historyHasNext, setHistoryHasNext] = useState(false);
  const [isHistoryAuthenticated, setIsHistoryAuthenticated] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyCardsVisible, setHistoryCardsVisible] = useState(true);
  const [historyDirection, setHistoryDirection] = useState<"left" | "right">("right");
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [selectedSavedHistory, setSelectedSavedHistory] = useState<GenerationHistoryItem | null>(null);

  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseRafRef = useRef<number | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const requestVersionRef = useRef(0);
  const usageHintCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoFixtureIndexRef = useRef(0);
  const demoCharIndexRef = useRef(0);
  const shouldSkipDemoRef = useRef(false);
  const isDemoPausedRef = useRef(false);
  const demoTimerMetaRef = useRef<TimerMeta>({
    callback: null,
    delayMs: 0,
    remainingMs: 0,
    startedAtMs: 0,
  });
  const revealTimerMetaRef = useRef<TimerMeta>({
    callback: null,
    delayMs: 0,
    remainingMs: 0,
    startedAtMs: 0,
  });

  const setRevealTimer = useCallback((callback: () => void, delayMs: number) => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    revealTimerMetaRef.current = {
      callback,
      delayMs,
      remainingMs: delayMs,
      startedAtMs: Date.now(),
    };
    revealTimeoutRef.current = setTimeout(() => {
      revealTimeoutRef.current = null;
      const cb = revealTimerMetaRef.current.callback;
      revealTimerMetaRef.current = { callback: null, delayMs: 0, remainingMs: 0, startedAtMs: 0 };
      if (cb) cb();
    }, delayMs);
  }, []);

  const pauseRevealTimer = useCallback(() => {
    if (!revealTimeoutRef.current || !revealTimerMetaRef.current.callback) return;
    clearTimeout(revealTimeoutRef.current);
    revealTimeoutRef.current = null;
    const elapsed = Date.now() - revealTimerMetaRef.current.startedAtMs;
    revealTimerMetaRef.current.remainingMs = Math.max(revealTimerMetaRef.current.delayMs - elapsed, 0);
  }, []);

  const resumeRevealTimer = useCallback(() => {
    if (revealTimeoutRef.current || !revealTimerMetaRef.current.callback) return;
    const delayMs = revealTimerMetaRef.current.remainingMs;
    revealTimerMetaRef.current.delayMs = delayMs;
    revealTimerMetaRef.current.startedAtMs = Date.now();
    revealTimeoutRef.current = setTimeout(() => {
      revealTimeoutRef.current = null;
      const cb = revealTimerMetaRef.current.callback;
      revealTimerMetaRef.current = { callback: null, delayMs: 0, remainingMs: 0, startedAtMs: 0 };
      if (cb) cb();
    }, delayMs);
  }, []);

  const clearRevealTimer = useCallback(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    revealTimerMetaRef.current = { callback: null, delayMs: 0, remainingMs: 0, startedAtMs: 0 };
  }, []);

  const setDemoTimer = useCallback((callback: () => void, delayMs: number) => {
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }
    demoTimerMetaRef.current = {
      callback,
      delayMs,
      remainingMs: delayMs,
      startedAtMs: Date.now(),
    };
    demoTimeoutRef.current = setTimeout(() => {
      demoTimeoutRef.current = null;
      const cb = demoTimerMetaRef.current.callback;
      demoTimerMetaRef.current = { callback: null, delayMs: 0, remainingMs: 0, startedAtMs: 0 };
      if (cb) cb();
    }, delayMs);
  }, []);

  const pauseDemoTimer = useCallback(() => {
    if (!demoTimeoutRef.current || !demoTimerMetaRef.current.callback) return;
    clearTimeout(demoTimeoutRef.current);
    demoTimeoutRef.current = null;
    const elapsed = Date.now() - demoTimerMetaRef.current.startedAtMs;
    demoTimerMetaRef.current.remainingMs = Math.max(demoTimerMetaRef.current.delayMs - elapsed, 0);
  }, []);

  const resumeDemoTimer = useCallback(() => {
    if (demoTimeoutRef.current || !demoTimerMetaRef.current.callback) return;
    const delayMs = demoTimerMetaRef.current.remainingMs;
    demoTimerMetaRef.current.delayMs = delayMs;
    demoTimerMetaRef.current.startedAtMs = Date.now();
    demoTimeoutRef.current = setTimeout(() => {
      demoTimeoutRef.current = null;
      const cb = demoTimerMetaRef.current.callback;
      demoTimerMetaRef.current = { callback: null, delayMs: 0, remainingMs: 0, startedAtMs: 0 };
      if (cb) cb();
    }, delayMs);
  }, []);

  const clearDemoTimer = useCallback(() => {
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }
    demoTimerMetaRef.current = { callback: null, delayMs: 0, remainingMs: 0, startedAtMs: 0 };
    if (collapseRafRef.current) {
      cancelAnimationFrame(collapseRafRef.current);
      collapseRafRef.current = null;
    }
  }, []);

  const markUserInteraction = useCallback(() => {
    if (!isDemoActive) return;
    isDemoPausedRef.current = false;
    setIsDemoActive(false);
    clearDemoTimer();
    clearRevealTimer();
    setDemoPhase("typing");
    setClearPhase("idle");
    setShellHeightTransitionMs(0);
    setShellHeightPx(null);
    setApiTags([]);
    setVisibleTags([]);
    setIsGenerating(false);
  }, [clearDemoTimer, clearRevealTimer, isDemoActive]);

  const playSheen = useCallback(() => {
    setActiveSheenId(Date.now());
  }, []);

  const focusTitleInput = useCallback(() => {
    window.setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 20);
  }, []);

  const demoFixtures = useMemo(() => demoConfig?.fixtures ?? DEMO_FIXTURES, [demoConfig?.fixtures]);
  const demoTimings = useMemo<DemoTimings>(
    () => ({
      ...DEFAULT_DEMO_TIMINGS,
      ...(demoConfig?.timings ?? {}),
    }),
    [demoConfig?.timings],
  );

  const getCurrentDemoFixtureTitle = useCallback(() => {
    if (!demoFixtures.length) return DEFAULT_TITLE_PLACEHOLDER;
    const index = demoFixtureIndexRef.current % demoFixtures.length;
    const fixtureTitle = demoFixtures[index]?.title?.trim();
    if (!fixtureTitle) return DEFAULT_TITLE_PLACEHOLDER;
    return fixtureTitle.toLowerCase().startsWith("e.g.")
      ? fixtureTitle
      : `e.g. ${fixtureTitle}`;
  }, [demoFixtures]);

  const refreshUsageLabel = useCallback(async () => {
    try {
      const response = await fetch("/api/account/usage", { method: "GET" });
      if (!response.ok) {
        return { usageLabel: null as string | null, resolved: false };
      }
      const data = (await response.json()) as AccountUsageResponse;
      const nextLabel = typeof data.usageLabel === "string" ? data.usageLabel.trim() : "";
      setUsageLabel(nextLabel || null);
      setMonthlyResetAt(
        typeof data.monthlyResetAt === "string" && data.monthlyResetAt.trim()
          ? data.monthlyResetAt
          : null,
      );
      return { usageLabel: nextLabel || null, resolved: true };
    } catch {
      setUsageLabel(null);
      setMonthlyResetAt(null);
      return { usageLabel: null as string | null, resolved: false };
    }
  }, []);

  const loadHistoryPage = useCallback(
    async ({
      page,
      selectNewest = false,
    }: {
      page: number;
      selectNewest?: boolean;
    }) => {
      setIsHistoryLoading(true);
      try {
        const response = await fetch(
          `/api/generations/history?limit=${HISTORY_PAGE_SIZE}&page=${page}`,
          { method: "GET" },
        );
        if (response.status === 401) {
          setIsHistoryAuthenticated(false);
          setHistoryItems([]);
          setHistoryHasPrev(false);
          setHistoryHasNext(false);
          return;
        }
        if (!response.ok) {
          throw new Error("Could not load history.");
        }

        const data = (await response.json()) as GenerationHistoryResponse;
        const nextItems = Array.isArray(data.items) ? data.items : [];

        setIsHistoryAuthenticated(true);
        setHistoryItems(nextItems);
        setHistoryPage(data.page ?? page);
        setHistoryHasPrev(Boolean(data.hasPrev));
        setHistoryHasNext(Boolean(data.hasNext));

        if (nextItems.length === 0) {
          setSelectedHistoryId(null);
          setSelectedSavedHistory(null);
          return;
        }

        if (selectNewest) {
          const newest = nextItems[nextItems.length - 1];
          setSelectedHistoryId(newest.id);
          setSelectedSavedHistory(newest);
          return;
        }

        setSelectedHistoryId((current) => {
          const matched = current ? nextItems.find((item) => item.id === current) : null;
          if (matched) {
            setSelectedSavedHistory(matched);
            return matched.id;
          }
          const fallback = nextItems[nextItems.length - 1];
          setSelectedSavedHistory(fallback);
          return fallback.id;
        });
      } catch {
        setIsHistoryAuthenticated(false);
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [],
  );

  const pageHistory = useCallback(
    async (direction: "left" | "right") => {
      if (isHistoryLoading) return;

      const nextPage = direction === "left" ? historyPage + 1 : historyPage - 1;
      if (nextPage < 0) return;

      if (direction === "left" && !historyHasNext) return;
      if (direction === "right" && !historyHasPrev) return;

      setHistoryDirection(direction);
      setHistoryCardsVisible(false);
      await new Promise((resolve) => setTimeout(resolve, HISTORY_TRANSITION_MS));
      await loadHistoryPage({ page: nextPage, selectNewest: true });
      await new Promise((resolve) => setTimeout(resolve, 100));
      setHistoryCardsVisible(true);
    },
    [historyHasNext, historyHasPrev, historyPage, isHistoryLoading, loadHistoryPage],
  );

  const openUsageHint = useCallback(() => {
    if (usageHintCloseTimeoutRef.current) {
      clearTimeout(usageHintCloseTimeoutRef.current);
      usageHintCloseTimeoutRef.current = null;
    }
    setIsUsageHintOpen(true);
  }, []);

  const queueUsageHintClose = useCallback(() => {
    if (usageHintCloseTimeoutRef.current) {
      clearTimeout(usageHintCloseTimeoutRef.current);
      usageHintCloseTimeoutRef.current = null;
    }
    usageHintCloseTimeoutRef.current = setTimeout(() => {
      setIsUsageHintOpen(false);
      usageHintCloseTimeoutRef.current = null;
    }, USAGE_HINT_CLOSE_DELAY_MS);
  }, []);

  const animateApiTagsIn = useCallback(
    (tags: string[], requestVersion: number) => {
      clearRevealTimer();
      setVisibleTags([]);

      let tagIndex = 0;

      const revealNext = () => {
        if (requestVersionRef.current !== requestVersion) return;

        if (tagIndex < tags.length) {
          const nextTag = tags[tagIndex];
          tagIndex += 1;
          setVisibleTags((prev) => [...prev, nextTag]);
          setRevealTimer(revealNext, demoTimings.revealStepMs);
        }
      };

      setRevealTimer(revealNext, demoTimings.revealStepMs);
    },
    [clearRevealTimer, demoTimings.revealStepMs, setRevealTimer],
  );

  useEffect(() => {
    void refreshUsageLabel();
  }, [refreshUsageLabel]);

  useEffect(() => {
    void loadHistoryPage({ page: 0, selectNewest: true });
  }, [loadHistoryPage]);

  useEffect(() => {
    const onCta = () => {
      setShowDescription(true);
      focusTitleInput();
      playSheen();
    };

    window.addEventListener(GENERATOR_CTA_EVENT, onCta as EventListener);
    return () => window.removeEventListener(GENERATOR_CTA_EVENT, onCta as EventListener);
  }, [focusTitleInput, playSheen]);

  useEffect(() => {
    return () => {
      clearRevealTimer();
    };
  }, [clearRevealTimer]);

  useEffect(() => {
    return () => {
      if (usageHintCloseTimeoutRef.current) {
        clearTimeout(usageHintCloseTimeoutRef.current);
      }
    };
  }, []);

  const setResultTags = useCallback(
    (target: string[], discovery: string[]) => {
      const cleanTags = sanitizeMergedTags(target, discovery);
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;

      setApiTags(cleanTags);
      animateApiTagsIn(cleanTags, requestVersion);
    },
    [animateApiTagsIn],
  );

  useEffect(() => {
    if (!isDemoActive || shouldSkipDemoRef.current) return;

    clearDemoTimer();
    clearRevealTimer();
    const resetDemoVisualState = () => {
      setDemoPhase("typing");
      setError("");
      setPaywall(null);
      setEntitlementUsed(null);
      setDescription("");
      setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
      setApiTags([]);
      setVisibleTags([]);
      setIsUnlockingFromPaywall(false);
      setClearPhase("idle");
      setIsGenerating(false);
      setCopied(false);
    };

    const runCycle = () => {
      if (!isDemoActive || shouldSkipDemoRef.current) return;

      const fixture = demoFixtures[demoFixtureIndexRef.current % demoFixtures.length];
      resetDemoVisualState();
      demoCharIndexRef.current = 0;
      setTitle("");

      const runTyping = () => {
        if (!isDemoActive || shouldSkipDemoRef.current) return;
        demoCharIndexRef.current += 1;
        setTitle(fixture.title.slice(0, demoCharIndexRef.current));
        if (demoCharIndexRef.current < fixture.title.length) {
          setDemoTimer(runTyping, demoTimings.typingCharMs);
          return;
        }

        setDemoTimer(() => {
          if (!isDemoActive || shouldSkipDemoRef.current) return;
          setDemoPhase("generating");
          setIsGenerating(true);

          setDemoTimer(() => {
            if (!isDemoActive || shouldSkipDemoRef.current) return;
            setIsGenerating(false);
            setDemoPhase("revealing");
            setResultTags(fixture.tags.target, fixture.tags.discovery);

            const revealTagCount = sanitizeMergedTags(fixture.tags.target, fixture.tags.discovery).length;
            const revealDuration =
              revealTagCount * demoTimings.revealStepMs +
              demoTimings.revealTailMs +
              demoTimings.showDwellMs;
            setDemoTimer(() => {
              if (!isDemoActive || shouldSkipDemoRef.current) return;
              setDemoPhase("clearing");
              setClearPhase("fading");

              let titleLength = fixture.title.length;
              const runBackspace = () => {
                if (!isDemoActive || shouldSkipDemoRef.current) return;
                if (titleLength <= 0) {
                  demoFixtureIndexRef.current += 1;
                  setDemoTimer(runCycle, demoTimings.cyclePauseMs);
                  return;
                }

                titleLength -= 1;
                setTitle(fixture.title.slice(0, titleLength));
                setDemoTimer(runBackspace, demoTimings.backspaceCharMs);
              };

              setDemoTimer(() => {
                if (!isDemoActive || shouldSkipDemoRef.current) return;
                const shell = shellRef.current;
                const fromHeight = shell?.getBoundingClientRect().height ?? null;
                if (fromHeight !== null) {
                  setShellHeightTransitionMs(0);
                  setShellHeightPx(fromHeight);
                }
                setVisibleTags([]);
                setApiTags([]);
                setClearPhase("collapsing");

                collapseRafRef.current = requestAnimationFrame(() => {
                  collapseRafRef.current = null;
                  if (!isDemoActive || shouldSkipDemoRef.current) return;
                  const contentHeight = contentRef.current?.getBoundingClientRect().height ?? null;
                  const toHeight = contentHeight !== null ? Math.max(contentHeight + 2, 0) : fromHeight;
                  if (fromHeight !== null && toHeight !== undefined) {
                    setShellHeightTransitionMs(demoTimings.clearCollapseMs);
                    setShellHeightPx(toHeight);
                  }

                  setDemoTimer(() => {
                    if (!isDemoActive || shouldSkipDemoRef.current) return;
                    setShellHeightTransitionMs(0);
                    setShellHeightPx(null);
                    setClearPhase("idle");
                    runBackspace();
                  }, demoTimings.clearCollapseMs);
                });
              }, demoTimings.clearFadeMs);
            }, revealDuration);
          }, demoTimings.generatingLoadMs);
        }, demoTimings.generatingDelayMs);
      };

      setDemoTimer(runTyping, demoTimings.typingStartDelayMs);
    };

    runCycle();

    return clearDemoTimer;
  }, [clearDemoTimer, clearRevealTimer, demoFixtures, demoTimings, isDemoActive, setDemoTimer, setResultTags]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (!isDemoActive || shouldSkipDemoRef.current) return;
        isDemoPausedRef.current = true;
        pauseDemoTimer();
        pauseRevealTimer();
        if (clearPhase === "collapsing") {
          setShellHeightTransitionMs(0);
          setShellHeightPx(null);
          setClearPhase("idle");
        }
      } else if (isDemoPausedRef.current && isDemoActive && !shouldSkipDemoRef.current) {
        isDemoPausedRef.current = false;
        resumeRevealTimer();
        resumeDemoTimer();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [clearPhase, isDemoActive, pauseDemoTimer, pauseRevealTimer, resumeDemoTimer, resumeRevealTimer]);

  useEffect(() => {
    if (!isDemoActive || shouldSkipDemoRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    const node = shellRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          if (!isDemoPausedRef.current) return;
          isDemoPausedRef.current = false;
          resumeRevealTimer();
          resumeDemoTimer();
          return;
        }

        if (isDemoPausedRef.current) return;
        isDemoPausedRef.current = true;
        pauseDemoTimer();
        pauseRevealTimer();
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isDemoActive, pauseDemoTimer, pauseRevealTimer, resumeDemoTimer, resumeRevealTimer]);

  useEffect(() => clearDemoTimer, [clearDemoTimer]);

  const runGeneration = useCallback(
    async (
      inputTitle: string,
      inputDescription: string,
      contextId: string,
      turnstileToken?: string | null,
    ) => {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(turnstileToken ? { "x-turnstile-token": turnstileToken } : {}),
        },
        body: JSON.stringify({
          title: inputTitle,
          description: inputDescription,
          generationContextId: contextId,
          turnstileToken,
        }),
      });

      const data = (await response.json()) as GenerateResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Could not generate tags.");
      }

      if (data.status === "paywall") {
        setIsUnlockingFromPaywall(false);
        setPaywall({
          reason: data.reason,
          message: data.message,
          requestId: data.requestId,
        });
        setEntitlementUsed(null);
        setResultTags(data.placeholders.target, data.placeholders.discovery);
        return;
      }

      setEntitlementUsed(data.entitlementUsed);
      setPaywall(null);
      setIsUnlockingFromPaywall(false);
      setResultTags(data.tags.target, data.tags.discovery);
      void refreshUsageLabel();
      void loadHistoryPage({ page: 0, selectNewest: true });

      clearPendingContext(contextId);

      const url = new URL(window.location.href);
      if (url.searchParams.has("gen_ctx") || url.searchParams.has("checkout")) {
        url.searchParams.delete("gen_ctx");
        url.searchParams.delete("checkout");
        window.history.replaceState({}, "", url.toString());
      }
    },
    [loadHistoryPage, refreshUsageLabel, setResultTags],
  );

  const executeGenerate = useCallback(async () => {
    markUserInteraction();
    if (!title.trim()) return;

    let turnstileToken: string | null = null;
    if (turnstileEnabled) {
      try {
        turnstileToken = await turnstileRef.current?.getToken() ?? null;
        if (!turnstileToken) {
          setError("Please complete the bot check and try again.");
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bot check failed. Please try again.");
        return;
      }
    }

    const contextId = generationContextId || generateContextId();
    setGenerationContextId(contextId);

    savePendingContext({
      id: contextId,
      title,
      description,
    });

    clearRevealTimer();
    setError("");
    setIsGenerating(true);
    setEntitlementUsed(null);
    setPaywall(null);
    setIsUnlockingFromPaywall(false);
    setUnlockReadyContext(null);
    setConfirmModalMode(null);
    setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
    setApiTags([]);
    setVisibleTags([]);
    setClearPhase("idle");
    setShellHeightTransitionMs(0);
    setShellHeightPx(null);

    try {
      await runGeneration(title, description, contextId, turnstileToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  }, [
    clearRevealTimer,
    description,
    generationContextId,
    markUserInteraction,
    runGeneration,
    title,
    turnstileEnabled,
  ]);

  const shouldConfirmFreeGeneration = useMemo(() => {
    const normalized = usageLabel?.toLowerCase() ?? "";
    return (
      normalized.includes("1 free generation") &&
      !paywall &&
      !isUnlockingFromPaywall
    );
  }, [isUnlockingFromPaywall, paywall, usageLabel]);

  const handleGenerate = useCallback(async () => {
    if (shouldConfirmFreeGeneration) {
      setConfirmModalMode("generate");
      return;
    }
    await executeGenerate();
  }, [executeGenerate, shouldConfirmFreeGeneration]);

  const goToLogin = () => {
    markUserInteraction();
    if (!title.trim()) {
      setError("Enter a listing title first.");
      return;
    }

    const contextId = generationContextId || generateContextId();
    setGenerationContextId(contextId);

    savePendingContext({
      id: contextId,
      title,
      description,
    });

    openAuthModal({
      mode: "signup",
      source: "generator_paywall",
      next: `/?gen_ctx=${encodeURIComponent(contextId)}`,
    });
  };

  const goToPricing = () => {
    markUserInteraction();
    playSheen();

    const onHome = window.location.pathname === "/";
    if (onHome) {
      const pricingEl = document.getElementById("pricing");
      if (pricingEl) {
        pricingEl.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    window.location.href = "/#pricing";
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const contextId = url.searchParams.get("gen_ctx");

    if (!contextId) return;
    shouldSkipDemoRef.current = true;
    setIsDemoActive(false);
    clearDemoTimer();
    clearRevealTimer();

    const context = loadPendingContext(contextId);
    if (!context) return;

    setGenerationContextId(context.id);
    setTitle(context.title);
    setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
    setDescription(context.description);
    setShowDescription(Boolean(context.description));

    const shouldResume =
      url.searchParams.get("checkout") === "success" ||
      url.searchParams.get("checkout") === "cancel" ||
      true;

    if (!shouldResume) return;

    window.setTimeout(() => {
      runGeneration(context.title, context.description, context.id).catch((err) => {
        setError(err instanceof Error ? err.message : "Could not resume generation.");
      });
    }, 120);
  }, [clearDemoTimer, clearRevealTimer, runGeneration]);

  useEffect(() => {
    const onAuthSuccess = () => {
      void refreshUsageLabel();
      void loadHistoryPage({ page: 0, selectNewest: true });
    };

    window.addEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
    return () => window.removeEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
  }, [loadHistoryPage, refreshUsageLabel]);

  useEffect(() => {
    const onAuthSuccess = () => {
      if (!paywall || paywall.reason !== "auth_required") return;
      if (!generationContextId) return;
      if (!visibleTags.length) return;

      const context = loadPendingContext(generationContextId);
      if (!context) return;

      setError("");
      setUnlockReadyContext(null);
      setConfirmModalMode(null);

      refreshUsageLabel().then(({ usageLabel: nextUsageLabel, resolved }) => {
        const shouldAutoUnlock = resolved && !nextUsageLabel;
        if (shouldAutoUnlock) {
          setPaywall(null);
          setIsUnlockingFromPaywall(true);
          setApiTags([]);
          setVisibleTags([]);
          runGeneration(context.title, context.description, context.id).catch((err) => {
            setIsUnlockingFromPaywall(false);
            setError(err instanceof Error ? err.message : "Could not resume generation.");
          });
          return;
        }

        setUnlockReadyContext(context);
      });
    };

    window.addEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
    return () => window.removeEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
  }, [generationContextId, paywall, refreshUsageLabel, runGeneration, visibleTags.length]);

  const beginUnlockFromContext = useCallback((context: PendingContext) => {
    setError("");
    setPaywall(null);
    setIsUnlockingFromPaywall(true);
    setUnlockReadyContext(null);
    setConfirmModalMode(null);
    setApiTags([]);
    setVisibleTags([]);
    runGeneration(context.title, context.description, context.id).catch((err) => {
      setIsUnlockingFromPaywall(false);
      setError(err instanceof Error ? err.message : "Could not resume generation.");
    });
  }, [runGeneration]);

  const onUnlockTags = useCallback(() => {
    if (!unlockReadyContext) return;
    setConfirmModalMode("unlock");
  }, [unlockReadyContext]);

  const confirmModalMessage = useMemo(() => {
    if (confirmModalMode === "generate") {
      return "You are about to use your one free generation. Would you like to use that now?";
    }
    const normalized = usageLabel?.toLowerCase() ?? "";
    if (normalized.includes("1 free generation")) {
      return "You are about to use your one free generation. Would you like to use that now?";
    }
    return "Would you like to use a generation to unlock the tags?";
  }, [confirmModalMode, usageLabel]);

  const confirmModalAction = useCallback(() => {
    if (confirmModalMode === "generate") {
      setConfirmModalMode(null);
      void executeGenerate();
      return;
    }

    if (!unlockReadyContext) return;
    beginUnlockFromContext(unlockReadyContext);
  }, [beginUnlockFromContext, confirmModalMode, executeGenerate, unlockReadyContext]);

  const onSelectHistoryItem = useCallback(
    (item: GenerationHistoryItem) => {
      if (item.isDraft) {
        setSelectedHistoryId("draft");
        return;
      }

      markUserInteraction();
      setSelectedHistoryId(item.id);
      setSelectedSavedHistory(item);
      setTitle(item.title);
      setDescription(item.description);
      setShowDescription(Boolean(item.description));
      setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
      setPaywall(null);
      setIsUnlockingFromPaywall(false);
      setUnlockReadyContext(null);
      setConfirmModalMode(null);
      setError("");
      setResultTags(item.targetTags, item.discoveryTags);
    },
    [markUserInteraction, setResultTags],
  );

  const clearDraftCard = useCallback(() => {
    setTitle("");
    setDescription("");
    setShowDescription(false);
    setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
    setApiTags([]);
    setVisibleTags([]);
    setPaywall(null);
    setUnlockReadyContext(null);
    setConfirmModalMode(null);
    setIsUnlockingFromPaywall(false);
    setError("");
    if (historyItems.length > 0) {
      const newest = historyItems[historyItems.length - 1];
      setSelectedHistoryId(newest.id);
      setSelectedSavedHistory(newest);
    } else {
      setSelectedHistoryId(null);
      setSelectedSavedHistory(null);
    }
  }, [historyItems]);

  const handleCopyAll = async () => {
    markUserInteraction();
    const allTags = visibleTags;

    if (!allTags.length || paywall) return;

    await navigator.clipboard.writeText(allTags.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalTags = visibleTags.length;
  const showResults = totalTags > 0 || isUnlockingFromPaywall || Boolean(paywall);
  const areAllTagsVisible = apiTags.length > 0 && visibleTags.length === apiTags.length;
  const canCopyAll = !paywall && !isUnlockingFromPaywall && areAllTagsVisible;
  const isClearingFade = clearPhase === "fading";
  const hasTitle = Boolean(title.trim());
  const usageHint = useMemo(
    () => getUsageHintText(usageLabel, monthlyResetAt),
    [monthlyResetAt, usageLabel],
  );
  const isFreeUsageHint = usageLabel?.toLowerCase().includes("free") ?? false;
  const monthlyResetDateText = useMemo(() => {
    if (!monthlyResetAt) return null;
    const date = new Date(monthlyResetAt);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }, [monthlyResetAt]);
  const showFreeGenerationModalTitle = confirmModalMode === "generate";
  const hasAnyInput = Boolean(title.trim() || description.trim());
  const hasDraftCard = useMemo(() => {
    if (!isHistoryAuthenticated) return false;
    if (!hasAnyInput) return false;
    if (!selectedSavedHistory) return true;
    const sameTitle = selectedSavedHistory.title.trim() === title.trim();
    const sameDescription = selectedSavedHistory.description.trim() === description.trim();
    return !(sameTitle && sameDescription);
  }, [description, hasAnyInput, isHistoryAuthenticated, selectedSavedHistory, title]);
  const displayHistoryCards = useMemo(() => {
    const cards = [...historyItems];
    if (hasDraftCard) {
      cards.push({
        id: "draft",
        createdAt: new Date().toISOString(),
        title: title.trim() || "Draft listing",
        description,
        targetTags: [],
        discoveryTags: [],
        isDraft: true,
      });
    }
    return cards;
  }, [description, hasDraftCard, historyItems, title]);
  const showHistoryStrip =
    isHistoryAuthenticated && (historyItems.length > 0 || hasDraftCard);

  useEffect(() => {
    if (selectedHistoryId === "draft" && !hasDraftCard) {
      if (historyItems.length > 0) {
        const newest = historyItems[historyItems.length - 1];
        setSelectedHistoryId(newest.id);
        setSelectedSavedHistory(newest);
      } else {
        setSelectedHistoryId(null);
        setSelectedSavedHistory(null);
      }
      return;
    }

    if (!selectedHistoryId || selectedHistoryId === "draft") return;
    const match = historyItems.find((item) => item.id === selectedHistoryId);
    if (match) {
      setSelectedSavedHistory(match);
    }
  }, [hasDraftCard, historyItems, selectedHistoryId]);
  return (
    <div ref={glowRef} id="generator" className="relative mx-auto max-w-2xl">
      <div className="pointer-events-none absolute -inset-8 overflow-hidden rounded-3xl">
        <GradientBackground />
      </div>

      <motion.div
        ref={shellRef}
        data-testid="generator-shell"
        data-clear-phase={clearPhase}
        data-height-locked={shellHeightPx !== null ? "true" : "false"}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: "1px solid rgba(255,255,255,0.92)",
          boxShadow:
            "0 24px 84px rgba(249,115,22,0.24), 0 12px 52px rgba(168,85,247,0.18), 0 1px 0 rgba(255,255,255,0.92) inset",
          height: shellHeightPx ?? undefined,
          transition: shellHeightPx !== null ? `height ${shellHeightTransitionMs}ms ease-out` : undefined,
        }}
      >
        {activeSheenId ? (
          <motion.div
            key={activeSheenId}
            initial={{ x: "-120%", opacity: 0 }}
            animate={{ x: "170%", opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.95, ease: "easeInOut" }}
            onAnimationComplete={() => setActiveSheenId(null)}
            className="pointer-events-none absolute inset-y-0 left-0 z-20 w-2/5 -skew-x-12"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.78) 45%, rgba(255,255,255,0) 100%)",
            }}
          />
        ) : null}

        <div ref={contentRef} className="relative z-10 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-stone-700">Tagloom Generator</span>
            {usageLabel ? (
              <motion.div
                key={usageLabel}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative ml-auto flex items-center gap-1.5"
              >
                <span className="text-xs text-stone-500">{usageLabel}</span>
                {usageHint ? (
                  <>
                    <button
                      type="button"
                      aria-label="Usage info"
                      aria-describedby={isUsageHintOpen ? "usage-hint-tooltip" : undefined}
                      onMouseEnter={openUsageHint}
                      onMouseLeave={queueUsageHintClose}
                      onFocus={openUsageHint}
                      onBlur={queueUsageHintClose}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-stone-500 transition-colors hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300/60"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                    <AnimatePresence>
                      {isUsageHintOpen ? (
                        <motion.div
                          id="usage-hint-tooltip"
                          role="tooltip"
                          onMouseEnter={openUsageHint}
                          onMouseLeave={queueUsageHintClose}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="absolute right-0 top-full z-20 mt-1.5 w-64 rounded-lg border border-stone-200 bg-white/95 px-3 py-2 text-xs leading-relaxed text-stone-600 shadow-lg backdrop-blur-sm"
                        >
                          {isFreeUsageHint ? (
                            <p>
                              New accounts get 1 free generation. You can purchase more generations in the{" "}
                              <button
                                type="button"
                                onClick={goToPricing}
                                className="font-medium text-orange-700 hover:text-orange-800 hover:underline"
                              >
                                pricing section
                              </button>
                              .
                            </p>
                          ) : (
                            <p>{usageHint}</p>
                          )}
                          {usageLabel.toLowerCase().includes("/100") && monthlyResetDateText ? (
                            <p className="mt-1.5">
                              Resets on{" "}
                              <Link
                                href="/billing"
                                className="font-medium text-orange-700 hover:text-orange-800 hover:underline"
                              >
                                {monthlyResetDateText}
                              </Link>
                              .
                            </p>
                          ) : null}
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </>
                ) : null}
              </motion.div>
            ) : null}
          </div>

          <div className="mb-3">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-stone-700">
                Listing Title <span className="text-orange-500">*</span>
              </label>
              {focusedField === "title" ? (
                <span className="text-xs font-medium text-stone-500">
                  {title.length}/{TITLE_MAX}
                </span>
              ) : null}
            </div>
            <input
              ref={titleInputRef}
              type="text"
              maxLength={TITLE_MAX}
              value={title}
              onFocus={() => {
                if (isDemoActive) {
                  setTitlePlaceholder(getCurrentDemoFixtureTitle());
                  setTitle("");
                }
                markUserInteraction();
                setShowDescription(true);
                setFocusedField("title");
                if (onFocus) onFocus();
              }}
              onBlur={() => {
                setFocusedField(null);
              }}
              onChange={(e) => {
                markUserInteraction();
                setTitle(e.target.value);
                if (isHistoryAuthenticated) {
                  setSelectedHistoryId("draft");
                }
                if (e.target.value.length > 0) {
                  setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
                }
              }}
              placeholder={titlePlaceholder}
              className="w-full rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            />
          </div>

          <AnimatePresence>
            {showDescription && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-3 overflow-visible"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-stone-700">Listing Description</label>
                  {focusedField === "description" ? (
                    <span className="text-xs font-medium text-stone-500">
                      {description.length}/{DESCRIPTION_MAX}
                    </span>
                  ) : null}
                </div>
                <textarea
                  maxLength={DESCRIPTION_MAX}
                  value={description}
                  onFocus={() => {
                    setFocusedField("description");
                  }}
                  onBlur={() => {
                    setFocusedField(null);
                  }}
                  onChange={(e) => {
                    markUserInteraction();
                    setDescription(e.target.value);
                    if (isHistoryAuthenticated) {
                      setSelectedHistoryId("draft");
                    }
                  }}
                  placeholder="Add more details about your product to get more accurate tags..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !title.trim()}
            className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
              hasTitle
                ? "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                : "bg-gray-300"
            }`}
            style={{
              boxShadow: title.trim() ? "0 4px 20px rgba(249,115,22,0.35)" : "none",
            }}
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
                />
                <span className="sr-only">Generating tags</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate 13 tags
              </>
            )}
          </button>

            {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          <TurnstileField ref={turnstileRef} onError={setError} />
          <AnimatePresence>
            {showResults && (
              <motion.div
                data-testid="results-block"
                initial={{ opacity: 0, y: 8 }}
                animate={isClearingFade ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
                transition={{ duration: isClearingFade ? 0.16 : 0.22, ease: "easeOut" }}
                className="mt-6"
              >
                {!isUnlockingFromPaywall ? (
                  <div className="mb-3 flex items-center justify-between">
                    <span data-testid="generated-tag-count" className="text-sm font-medium text-stone-700">
                      {totalTags} tags generated
                    </span>
                    <button
                      onClick={handleCopyAll}
                      disabled={!canCopyAll}
                      className={`flex w-[90px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        canCopyAll
                          ? "cursor-pointer bg-stone-100 text-stone-600 hover:bg-orange-100 hover:text-orange-700"
                          : "cursor-not-allowed bg-stone-100 text-stone-500 opacity-50"
                      }`}
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied!" : "Copy all"}
                    </button>
                  </div>
                ) : null}

                {isUnlockingFromPaywall ? (
                  <div className="mt-3 flex flex-col items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white/70 py-8">
                    <div className="relative h-12 w-12">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-2 border-orange-200 border-t-orange-500"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <LockOpen className="h-5 w-5 text-orange-600" />
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-stone-700">Unlocking tags</p>
                  </div>
                ) : paywall?.reason === "auth_required" && unlockReadyContext ? (
                  <div className="mt-3 flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white/70 py-8">
                    <div className="relative h-12 w-12">
                      <div className="absolute inset-0 flex items-center justify-center rounded-full border border-orange-300 bg-white text-orange-600">
                        <LockOpen className="h-5 w-5" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onUnlockTags}
                      className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700"
                    >
                      Unlock generated tags
                    </button>
                  </div>
                ) : (
                  <div className={`flex flex-wrap gap-2 ${paywall ? "blur-sm select-none" : ""}`}>
                    {visibleTags.map((tag, i) => (
                      <motion.span
                        key={`${tag}-${i}`}
                        data-testid="generated-tag-chip"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 20 }}
                        className="cursor-default rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm"
                      >
                        {tag}
                      </motion.span>
                    ))}
                  </div>
                )}

                {paywall && !(paywall.reason === "auth_required" && unlockReadyContext) ? (
                  <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                    {paywall.reason === "auth_required" ? (
                      <div className="space-y-3 text-center">
                        {!unlockReadyContext ? (
                          <>
                            <p className="text-sm font-semibold text-orange-800">
                              Create an account or log in to unlock this generation for FREE
                            </p>
                            <button
                              type="button"
                              onClick={goToLogin}
                              className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700"
                            >
                              Create account / log in
                            </button>
                          </>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-3 text-center">
                        <p className="text-sm font-semibold text-orange-800">
                          You have no remaining generation credits.
                        </p>
                        <button
                          type="button"
                          onClick={goToPricing}
                          className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700"
                        >
                          Get more generations
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {showHistoryStrip ? (
            <div className="mt-4 rounded-xl border border-stone-200 bg-white/70 p-3">
              <div className="flex items-center gap-2">
                {historyHasNext ? (
                  <button
                    type="button"
                    aria-label="Show older generations"
                    onClick={() => void pageHistory("left")}
                    disabled={isHistoryLoading}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition-colors hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                ) : null}

                <div className="min-h-[80px] flex-1 overflow-hidden">
                  <AnimatePresence mode="wait">
                    {historyCardsVisible ? (
                      <motion.div
                        key={`history-page-${historyPage}-${displayHistoryCards.map((item) => item.id).join("-")}`}
                        initial={{
                          opacity: 0,
                          x: historyDirection === "left" ? 10 : -10,
                        }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{
                          opacity: 0,
                          x: historyDirection === "left" ? -10 : 10,
                        }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="flex items-stretch gap-2"
                      >
                        {displayHistoryCards.map((item) => {
                          const isSelected = selectedHistoryId === item.id || (item.isDraft && selectedHistoryId === "draft");
                          const cardDate = item.isDraft ? "Draft" : formatHistoryDate(item.createdAt);
                          const cardTitle = truncateTitle(item.title, 26);
                          return (
                            <div
                              key={item.isDraft ? "draft-card" : item.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => onSelectHistoryItem(item)}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.key !== " ") return;
                                event.preventDefault();
                                onSelectHistoryItem(item);
                              }}
                              className={`relative h-20 min-w-[148px] max-w-[148px] rounded-lg border px-2.5 py-2 text-left transition-all ${
                                isSelected
                                  ? "border-orange-400 bg-orange-50 shadow-sm"
                                  : "border-stone-200 bg-white hover:border-orange-300"
                              }`}
                            >
                              {item.isDraft ? (
                                <>
                                  <span className="inline-flex rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                                    Draft
                                  </span>
                                  <button
                                    type="button"
                                    aria-label="Delete draft"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      clearDraftCard();
                                    }}
                                    className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-md text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : null}
                              <p className="mt-1 text-[11px] font-medium text-stone-500">{cardDate}</p>
                              <p className="mt-1 text-xs font-semibold leading-snug text-stone-700">{cardTitle}</p>
                            </div>
                          );
                        })}
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`history-loading-${historyPage}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="h-20"
                      />
                    )}
                  </AnimatePresence>
                </div>

                {historyHasPrev ? (
                  <button
                    type="button"
                    aria-label="Show newer generations"
                    onClick={() => void pageHistory("right")}
                    disabled={isHistoryLoading}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition-colors hover:border-orange-300 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

        </div>
      </motion.div>

      <AnimatePresence>
        {confirmModalMode ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <button
              type="button"
              aria-label="Close unlock confirmation"
              className="absolute inset-0 bg-stone-900/45"
              onClick={() => setConfirmModalMode(null)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className="relative z-10 w-full max-w-xs rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {showFreeGenerationModalTitle ? (
                <h3 className="mb-2 text-left text-base font-semibold">
                  <span className="text-stone-900">You have </span>
                  <span className="text-orange-700">1 Free Generation</span>
                </h3>
              ) : null}
              <p className="text-left text-sm font-medium leading-relaxed text-stone-700">
                {confirmModalMessage}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={confirmModalAction}
                  className="w-full rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-3.5 py-2 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmModalMode(null)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                >
                  No
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
