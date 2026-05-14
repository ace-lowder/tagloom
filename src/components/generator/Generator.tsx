"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Copy, Info, LockOpen, Sparkles } from "lucide-react";
import FeedbackButtons, { type FeedbackRating } from "@/components/feedback/FeedbackButtons";
import FeedbackModal from "@/components/feedback/FeedbackModal";
import { toastMessages } from "@/components/toasts/toastMessages";
import { useToast } from "@/components/toasts/toasts";
import { useAuthController } from "@/components/auth/AuthController";
import { Button } from "@/components/ui/button";
import TurnstileField, {
  type TurnstileFieldHandle,
} from "@/components/security/TurnstileField";
import { AUTH_SUCCESS_EVENT } from "@/lib/authModal";
import { GENERATOR_CTA_EVENT } from "@/lib/generatorCta";
import { cn } from "@/lib/utils";
import GradientBackground from "./GradientBackground";
import {
  HistoryPanel,
  type GenerationHistoryItem,
  type HistoryMode,
  type HistorySortKey,
  type HistorySortState,
} from "./HistoryPanel";
import {
  DEFAULT_DEMO_TIMINGS,
  DEFAULT_TITLE_PLACEHOLDER,
  DEMO_FIXTURES,
  DESCRIPTION_MAX,
  GENERATED_TAG_CHIP_CLASSNAME,
  TITLE_MAX,
  USAGE_HINT_CLOSE_DELAY_MS,
  CTA_SCROLL_CORRECTION_DELAY_MS,
} from "./generatorConstants";
import {
  clearHistoryCache,
  clearPendingContext,
  generateContextId,
  loadPendingContext,
  readHistoryCache,
  savePendingContext,
  writeHistoryCache,
} from "./generatorStorage";
import { getUsageHintText, sanitizeMergedTags } from "./generatorTags";
import {
  archiveGeneration,
  fetchAccountUsage,
  fetchGenerationHistory,
  requestGeneration,
  restoreGeneration,
  saveGenerationFeedback,
} from "./generatorApi";
import type {
  ClearPhase,
  DemoPhase,
  DemoTimings,
  DescriptionRevealMode,
  DraftHistoryState,
  GenerationFeedback,
  GeneratorProps,
  HistoryConfirmAction,
  PaywallState,
  PendingContext,
  TimerMeta,
} from "./generatorTypes";

export default function Generator({
  onFocus,
  glowRef,
  demoConfig,
}: GeneratorProps) {
  const { openAuthModal } = useAuthController();
  const { showToast } = useToast();
  const turnstileRef = useRef<TurnstileFieldHandle | null>(null);
  const turnstileEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

  // === State ===
  const [title, setTitle] = useState("");
  const [titlePlaceholder, setTitlePlaceholder] = useState(
    DEFAULT_TITLE_PLACEHOLDER,
  );
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [descriptionRevealMode, setDescriptionRevealMode] =
    useState<DescriptionRevealMode>("idle");
  const [focusedField, setFocusedField] = useState<
    "title" | "description" | null
  >(null);

  const [apiTags, setApiTags] = useState<string[]>([]);
  const [visibleTags, setVisibleTags] = useState<string[]>([]);
  const [shouldAnimateTagChips, setShouldAnimateTagChips] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [entitlementUsed, setEntitlementUsed] = useState<string | null>(null);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(
    null,
  );
  const [currentGenerationFeedback, setCurrentGenerationFeedback] =
    useState<GenerationFeedback | null>(null);
  const [isGenerationFeedbackSaving, setIsGenerationFeedbackSaving] =
    useState(false);
  const [isGenerationDownvoteModalOpen, setIsGenerationDownvoteModalOpen] =
    useState(false);
  const generationDownvotePreviousFeedbackRef = useRef<GenerationFeedback | null>(
    null,
  );
  const [usageLabel, setUsageLabel] = useState<string | null>(null);
  const [monthlyResetAt, setMonthlyResetAt] = useState<string | null>(null);
  const [isUsageHintOpen, setIsUsageHintOpen] = useState(false);
  const [paywall, setPaywall] = useState<PaywallState | null>(null);
  const [isUnlockingFromPaywall, setIsUnlockingFromPaywall] = useState(false);
  const [unlockReadyContext, setUnlockReadyContext] =
    useState<PendingContext | null>(null);
  const [confirmModalMode, setConfirmModalMode] = useState<
    "unlock" | "generate" | null
  >(null);
  const [activeSheenId, setActiveSheenId] = useState<number | null>(null);
  const [generationContextId, setGenerationContextId] = useState<string | null>(
    null,
  );
  const [isDemoActive, setIsDemoActive] = useState(true);
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("typing");
  const [clearPhase, setClearPhase] = useState<ClearPhase>("idle");
  const [shellHeightPx, setShellHeightPx] = useState<number | null>(null);
  const [shellHeightTransitionMs, setShellHeightTransitionMs] = useState(0);
  const [historyShellHeightPx, setHistoryShellHeightPx] = useState<
    number | null
  >(null);
  const [historyItems, setHistoryItems] = useState<GenerationHistoryItem[]>([]);
  const [historyMode, setHistoryMode] = useState<HistoryMode>("generator");
  const [historySortState, setHistorySortState] =
    useState<HistorySortState>(null);
  const [showArchivedHistory, setShowArchivedHistory] = useState(false);
  const [isHistoryAuthenticated, setIsHistoryAuthenticated] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [skipGeneratorReturnAnimations, setSkipGeneratorReturnAnimations] =
    useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null,
  );
  const [draftHistoryItems, setDraftHistoryItems] = useState<
    DraftHistoryState[]
  >([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [historyConfirmAction, setHistoryConfirmAction] =
    useState<HistoryConfirmAction | null>(null);

  // === Timers ===
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseRafRef = useRef<number | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const requestVersionRef = useRef(0);
  const usageHintCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const ctaScrollCorrectionTimeoutRef = useRef<number | null>(null);
  const demoFixtureIndexRef = useRef(0);
  const demoCharIndexRef = useRef(0);
  const shouldSkipDemoRef = useRef(false);
  const hasPlayedFirstDescriptionRevealRef = useRef(false);
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

  // === Derived State ===
  const displayHistoryItems = useMemo<GenerationHistoryItem[]>(() => {
    const items = [...historyItems];
    for (const draft of draftHistoryItems) {
      items.push({
        id: draft.id,
        createdAt: draft.updatedAt,
        title: draft.title,
        description: draft.description,
        targetTags: [],
        discoveryTags: [],
        isDraft: true,
      });
    }
    return items;
  }, [draftHistoryItems, historyItems]);

  const setRevealTimer = useCallback(
    (callback: () => void, delayMs: number) => {
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
        revealTimerMetaRef.current = {
          callback: null,
          delayMs: 0,
          remainingMs: 0,
          startedAtMs: 0,
        };
        if (cb) cb();
      }, delayMs);
    },
    [],
  );

  const pauseRevealTimer = useCallback(() => {
    if (!revealTimeoutRef.current || !revealTimerMetaRef.current.callback)
      return;
    clearTimeout(revealTimeoutRef.current);
    revealTimeoutRef.current = null;
    const elapsed = Date.now() - revealTimerMetaRef.current.startedAtMs;
    revealTimerMetaRef.current.remainingMs = Math.max(
      revealTimerMetaRef.current.delayMs - elapsed,
      0,
    );
  }, []);

  const resumeRevealTimer = useCallback(() => {
    if (revealTimeoutRef.current || !revealTimerMetaRef.current.callback)
      return;
    const delayMs = revealTimerMetaRef.current.remainingMs;
    revealTimerMetaRef.current.delayMs = delayMs;
    revealTimerMetaRef.current.startedAtMs = Date.now();
    revealTimeoutRef.current = setTimeout(() => {
      revealTimeoutRef.current = null;
      const cb = revealTimerMetaRef.current.callback;
      revealTimerMetaRef.current = {
        callback: null,
        delayMs: 0,
        remainingMs: 0,
        startedAtMs: 0,
      };
      if (cb) cb();
    }, delayMs);
  }, []);

  const clearRevealTimer = useCallback(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    revealTimerMetaRef.current = {
      callback: null,
      delayMs: 0,
      remainingMs: 0,
      startedAtMs: 0,
    };
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
      demoTimerMetaRef.current = {
        callback: null,
        delayMs: 0,
        remainingMs: 0,
        startedAtMs: 0,
      };
      if (cb) cb();
    }, delayMs);
  }, []);

  const pauseDemoTimer = useCallback(() => {
    if (!demoTimeoutRef.current || !demoTimerMetaRef.current.callback) return;
    clearTimeout(demoTimeoutRef.current);
    demoTimeoutRef.current = null;
    const elapsed = Date.now() - demoTimerMetaRef.current.startedAtMs;
    demoTimerMetaRef.current.remainingMs = Math.max(
      demoTimerMetaRef.current.delayMs - elapsed,
      0,
    );
  }, []);

  const resumeDemoTimer = useCallback(() => {
    if (demoTimeoutRef.current || !demoTimerMetaRef.current.callback) return;
    const delayMs = demoTimerMetaRef.current.remainingMs;
    demoTimerMetaRef.current.delayMs = delayMs;
    demoTimerMetaRef.current.startedAtMs = Date.now();
    demoTimeoutRef.current = setTimeout(() => {
      demoTimeoutRef.current = null;
      const cb = demoTimerMetaRef.current.callback;
      demoTimerMetaRef.current = {
        callback: null,
        delayMs: 0,
        remainingMs: 0,
        startedAtMs: 0,
      };
      if (cb) cb();
    }, delayMs);
  }, []);

  const clearDemoTimer = useCallback(() => {
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }
    demoTimerMetaRef.current = {
      callback: null,
      delayMs: 0,
      remainingMs: 0,
      startedAtMs: 0,
    };
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
    setShouldAnimateTagChips(false);
    setIsGenerating(false);
  }, [clearDemoTimer, clearRevealTimer, isDemoActive]);

  const playSheen = useCallback(() => {
    setActiveSheenId(Date.now());
  }, []);

  const focusTitleInput = useCallback(() => {
    window.setTimeout(() => {
      titleInputRef.current?.focus({ preventScroll: true });
      titleInputRef.current?.select();
    }, 20);
  }, []);

  const scheduleCtaScrollCorrection = useCallback(() => {
    if (ctaScrollCorrectionTimeoutRef.current) {
      window.clearTimeout(ctaScrollCorrectionTimeoutRef.current);
    }
    ctaScrollCorrectionTimeoutRef.current = window.setTimeout(() => {
      document
        .getElementById("generator")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      ctaScrollCorrectionTimeoutRef.current = null;
    }, CTA_SCROLL_CORRECTION_DELAY_MS);
  }, []);

  // === Demo ===
  const demoFixtures = useMemo(
    () => demoConfig?.fixtures ?? DEMO_FIXTURES,
    [demoConfig?.fixtures],
  );
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

  const revealDescriptionFromFocus = useCallback(() => {
    if (showDescription) return;
    const shouldAnimate =
      !hasPlayedFirstDescriptionRevealRef.current &&
      !skipGeneratorReturnAnimations;
    if (shouldAnimate) {
      hasPlayedFirstDescriptionRevealRef.current = true;
      setDescriptionRevealMode("first-focus");
    } else {
      setDescriptionRevealMode("none");
    }
    setShowDescription(true);
  }, [showDescription, skipGeneratorReturnAnimations]);

  const revealDescriptionWithoutAnimation = useCallback(() => {
    if (showDescription) return;
    setDescriptionRevealMode("none");
    setShowDescription(true);
  }, [showDescription]);

  const beginDemoInteraction = useCallback(() => {
    setTitlePlaceholder(getCurrentDemoFixtureTitle());
    setTitle("");
    markUserInteraction();
    revealDescriptionFromFocus();
    setFocusedField("title");
    focusTitleInput();
    onFocus?.();
  }, [
    focusTitleInput,
    getCurrentDemoFixtureTitle,
    markUserInteraction,
    onFocus,
    revealDescriptionFromFocus,
  ]);

  // === Usage ===
  const refreshUsageLabel = useCallback(async () => {
    const result = await fetchAccountUsage();
    setUsageLabel(result.usageLabel);
    setMonthlyResetAt(result.monthlyResetAt);
    return { usageLabel: result.usageLabel, resolved: result.resolved };
  }, []);

  // === History ===
  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const data = await fetchGenerationHistory();
      if (data.status === "unauthenticated") {
        setIsHistoryAuthenticated(false);
        setHistoryItems([]);
        setDraftHistoryItems([]);
        setSelectedDraftId(null);
        setSelectedHistoryId(null);
        setCurrentGenerationId(null);
        setCurrentGenerationFeedback(null);
        clearHistoryCache();
        return;
      }

      setIsHistoryAuthenticated(true);
      setHistoryItems(data.items);

      setSelectedHistoryId((current) => {
        if (!current) {
          return null;
        }
        if (current === "draft") {
          return current;
        }
        const matched = data.items.find((item) => item.id === current) ?? null;
        return matched ? matched.id : null;
      });
    } catch {
      setIsHistoryAuthenticated(false);
      setCurrentGenerationId(null);
      setCurrentGenerationFeedback(null);
      clearHistoryCache();
      showToast(toastMessages.historyLoadFailed);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [showToast]);

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
    const cached = readHistoryCache();
    if (cached) {
      const cachedItems = Array.isArray(cached.generatedItems)
        ? cached.generatedItems
        : [];
      setIsHistoryAuthenticated(true);
      setHistoryItems(cachedItems);
      const cachedDrafts = Array.isArray(cached.drafts) ? cached.drafts : [];
      setDraftHistoryItems(cachedDrafts);
      setHistoryMode("generator");
      setHistorySortState(cached.sortState);
      setShowArchivedHistory(cached.showArchived);
      setSelectedDraftId(
        cached.selectedDraftId &&
          cachedDrafts.some((draft) => draft.id === cached.selectedDraftId)
          ? cached.selectedDraftId
          : null,
      );
      if (cached.selectedGeneratedId || cached.selectedDraftId) {
        const nextSelectedId = cached.selectedDraftId
          ? "draft"
          : cached.selectedGeneratedId;
        setSelectedHistoryId(nextSelectedId);
        if (cached.selectedDraftId && cachedDrafts.length > 0) {
          const selectedDraft =
            cachedDrafts.find((draft) => draft.id === cached.selectedDraftId) ??
            cachedDrafts[cachedDrafts.length - 1];
          if (selectedDraft) {
            setTitle(selectedDraft.title);
            setDescription(selectedDraft.description);
            setDescriptionRevealMode("idle");
            setShowDescription(false);
          }
          setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
        }
      } else {
        setSelectedHistoryId(null);
      }
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!isDemoActive) return;
    setSelectedHistoryId(null);
  }, [isDemoActive]);

  useEffect(() => {
    if (!isHistoryAuthenticated) {
      clearHistoryCache();
      return;
    }
    writeHistoryCache({
      generatedItems: historyItems,
      selectedGeneratedId:
        selectedHistoryId && selectedHistoryId !== "draft"
          ? selectedHistoryId
          : null,
      drafts: draftHistoryItems,
      selectedDraftId,
      mode: "generator",
      sortState: historySortState,
      showArchived: showArchivedHistory,
      savedAt: Date.now(),
    });
  }, [
    draftHistoryItems,
    historyItems,
    historySortState,
    isHistoryAuthenticated,
    selectedHistoryId,
    selectedDraftId,
    showArchivedHistory,
  ]);

  useEffect(() => {
    const onCta = () => {
      revealDescriptionFromFocus();
      focusTitleInput();
      playSheen();
      scheduleCtaScrollCorrection();
    };

    window.addEventListener(GENERATOR_CTA_EVENT, onCta as EventListener);
    return () =>
      window.removeEventListener(GENERATOR_CTA_EVENT, onCta as EventListener);
  }, [
    focusTitleInput,
    playSheen,
    revealDescriptionFromFocus,
    scheduleCtaScrollCorrection,
  ]);

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
      if (ctaScrollCorrectionTimeoutRef.current) {
        clearTimeout(ctaScrollCorrectionTimeoutRef.current);
      }
    };
  }, []);

  const setResultTags = useCallback(
    (target: string[], discovery: string[]) => {
      const cleanTags = sanitizeMergedTags(target, discovery);
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;

      setApiTags(cleanTags);
      setShouldAnimateTagChips(true);
      animateApiTagsIn(cleanTags, requestVersion);
    },
    [animateApiTagsIn],
  );

  const setResultTagsImmediately = useCallback(
    (target: string[], discovery: string[]) => {
      const cleanTags = sanitizeMergedTags(target, discovery);
      requestVersionRef.current += 1;
      clearRevealTimer();
      setApiTags(cleanTags);
      setVisibleTags(cleanTags);
      setShouldAnimateTagChips(false);
    },
    [clearRevealTimer],
  );

  useEffect(() => {
    if (!isDemoActive || shouldSkipDemoRef.current) return;

    clearDemoTimer();
    clearRevealTimer();
    const resetDemoVisualState = () => {
      setDemoPhase("typing");
      setPaywall(null);
      setEntitlementUsed(null);
      setDescription("");
      setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
      setApiTags([]);
      setVisibleTags([]);
      setShouldAnimateTagChips(false);
      setIsUnlockingFromPaywall(false);
      setClearPhase("idle");
      setIsGenerating(false);
      setCopied(false);
    };

    const runCycle = () => {
      if (!isDemoActive || shouldSkipDemoRef.current) return;

      const fixture =
        demoFixtures[demoFixtureIndexRef.current % demoFixtures.length];
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

            const revealTagCount = sanitizeMergedTags(
              fixture.tags.target,
              fixture.tags.discovery,
            ).length;
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
                const fromHeight =
                  shell?.getBoundingClientRect().height ?? null;
                if (fromHeight !== null) {
                  setShellHeightTransitionMs(0);
                  setShellHeightPx(fromHeight);
                }
                setVisibleTags([]);
                setApiTags([]);
                setShouldAnimateTagChips(false);
                setClearPhase("collapsing");

                collapseRafRef.current = requestAnimationFrame(() => {
                  collapseRafRef.current = null;
                  if (!isDemoActive || shouldSkipDemoRef.current) return;
                  const contentHeight =
                    contentRef.current?.getBoundingClientRect().height ?? null;
                  const toHeight =
                    contentHeight !== null
                      ? Math.max(contentHeight + 2, 0)
                      : fromHeight;
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
  }, [
    clearDemoTimer,
    clearRevealTimer,
    demoFixtures,
    demoTimings,
    isDemoActive,
    setDemoTimer,
    setResultTags,
  ]);

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
      } else if (
        isDemoPausedRef.current &&
        isDemoActive &&
        !shouldSkipDemoRef.current
      ) {
        isDemoPausedRef.current = false;
        resumeRevealTimer();
        resumeDemoTimer();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [
    clearPhase,
    isDemoActive,
    pauseDemoTimer,
    pauseRevealTimer,
    resumeDemoTimer,
    resumeRevealTimer,
  ]);

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
  }, [
    isDemoActive,
    pauseDemoTimer,
    pauseRevealTimer,
    resumeDemoTimer,
    resumeRevealTimer,
  ]);

  useEffect(() => clearDemoTimer, [clearDemoTimer]);

  // === Generation ===
  const runGeneration = useCallback(
    async (
      inputTitle: string,
      inputDescription: string,
      contextId: string,
      turnstileToken?: string | null,
    ) => {
      const data = await requestGeneration({
        title: inputTitle,
        description: inputDescription,
        generationContextId: contextId,
        turnstileToken: turnstileToken ?? null,
      });

      if (data.status === "paywall") {
        setIsUnlockingFromPaywall(false);
        setPaywall({
          reason: data.reason,
          message: data.message,
          requestId: data.requestId,
        });
        setEntitlementUsed(null);
        setCurrentGenerationId(null);
        setCurrentGenerationFeedback(null);
        setResultTags(data.placeholders.target, data.placeholders.discovery);
        return;
      }

      setEntitlementUsed(data.entitlementUsed);
      setCurrentGenerationId(data.generationId);
      setCurrentGenerationFeedback(null);
      if (selectedHistoryId === "draft" && selectedDraftId) {
        setDraftHistoryItems((current) =>
          current.filter((draft) => draft.id !== selectedDraftId),
        );
        setSelectedDraftId(null);
      }
      setSelectedHistoryId(data.generationId);
      setPaywall(null);
      setIsUnlockingFromPaywall(false);
      setResultTags(data.tags.target, data.tags.discovery);
      void refreshUsageLabel();
      void loadHistory();

      clearPendingContext(contextId);

      const url = new URL(window.location.href);
      if (url.searchParams.has("gen_ctx") || url.searchParams.has("checkout")) {
        url.searchParams.delete("gen_ctx");
        url.searchParams.delete("checkout");
        window.history.replaceState({}, "", url.toString());
      }
    },
    [
      loadHistory,
      refreshUsageLabel,
      selectedDraftId,
      selectedHistoryId,
      setResultTags,
    ],
  );

  const executeGenerate = useCallback(async () => {
    markUserInteraction();
    if (!title.trim()) return;

    clearRevealTimer();
    setIsGenerating(true);
    setEntitlementUsed(null);
    setCurrentGenerationId(null);
    setCurrentGenerationFeedback(null);
    setPaywall(null);
    setIsUnlockingFromPaywall(false);
    setUnlockReadyContext(null);
    setConfirmModalMode(null);
    setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
    setApiTags([]);
    setVisibleTags([]);
    setShouldAnimateTagChips(false);
    setClearPhase("idle");
    setShellHeightTransitionMs(0);
    setShellHeightPx(null);

    let turnstileToken: string | null = null;
    if (turnstileEnabled) {
      try {
        turnstileToken = (await turnstileRef.current?.getToken()) ?? null;
        if (!turnstileToken) {
          showToast(toastMessages.botCheckFailed);
          setIsGenerating(false);
          return;
        }
      } catch (err) {
        showToast({
          ...toastMessages.botCheckFailed,
          body:
            err instanceof Error
              ? err.message
              : toastMessages.botCheckFailed.body,
        });
        setIsGenerating(false);
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

    try {
      await runGeneration(title, description, contextId, turnstileToken);
    } catch (err) {
      showToast({
        ...toastMessages.generationFailed,
        body:
          err instanceof Error
            ? err.message
            : toastMessages.generationFailed.body,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [
    clearRevealTimer,
    description,
    generationContextId,
    markUserInteraction,
    runGeneration,
    showToast,
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
      showToast(toastMessages.missingListingTitle);
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
    setDescriptionRevealMode("none");
    setShowDescription(Boolean(context.description));

    const shouldResume =
      url.searchParams.get("checkout") === "success" ||
      url.searchParams.get("checkout") === "cancel" ||
      true;

    if (!shouldResume) return;

    window.setTimeout(() => {
      runGeneration(context.title, context.description, context.id).catch(
        (err) => {
          showToast({
            ...toastMessages.generationResumeFailed,
            body:
              err instanceof Error
                ? err.message
                : toastMessages.generationResumeFailed.body,
          });
        },
      );
    }, 120);
  }, [clearDemoTimer, clearRevealTimer, runGeneration, showToast]);

  useEffect(() => {
    const onAuthSuccess = () => {
      void refreshUsageLabel();
      void loadHistory();
    };

    window.addEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
    return () => window.removeEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
  }, [loadHistory, refreshUsageLabel]);

  useEffect(() => {
    const onAuthSuccess = () => {
      if (!paywall || paywall.reason !== "auth_required") return;
      if (!generationContextId) return;
      if (!visibleTags.length) return;

      const context = loadPendingContext(generationContextId);
      if (!context) return;

      setUnlockReadyContext(null);
      setConfirmModalMode(null);

      refreshUsageLabel().then(({ usageLabel: nextUsageLabel, resolved }) => {
        const shouldAutoUnlock = resolved && !nextUsageLabel;
        if (shouldAutoUnlock) {
          setPaywall(null);
          setIsUnlockingFromPaywall(true);
          setApiTags([]);
          setVisibleTags([]);
          setShouldAnimateTagChips(false);
          runGeneration(context.title, context.description, context.id).catch(
            (err) => {
              setIsUnlockingFromPaywall(false);
              showToast({
                ...toastMessages.generationResumeFailed,
                body:
                  err instanceof Error
                    ? err.message
                    : toastMessages.generationResumeFailed.body,
              });
            },
          );
          return;
        }

        setUnlockReadyContext(context);
      });
    };

    window.addEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
    return () => window.removeEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
  }, [
    generationContextId,
    paywall,
    refreshUsageLabel,
    runGeneration,
    showToast,
    visibleTags.length,
  ]);

  const beginUnlockFromContext = useCallback(
    (context: PendingContext) => {
      setPaywall(null);
      setIsUnlockingFromPaywall(true);
      setUnlockReadyContext(null);
      setConfirmModalMode(null);
      setApiTags([]);
      setVisibleTags([]);
      setShouldAnimateTagChips(false);
      runGeneration(context.title, context.description, context.id).catch(
        (err) => {
          setIsUnlockingFromPaywall(false);
          showToast({
            ...toastMessages.generationResumeFailed,
            body:
              err instanceof Error
                ? err.message
                : toastMessages.generationResumeFailed.body,
          });
        },
      );
    },
    [runGeneration, showToast],
  );

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
  }, [
    beginUnlockFromContext,
    confirmModalMode,
    executeGenerate,
    unlockReadyContext,
  ]);

  const syncDraftFromUserInput = useCallback(
    (nextTitle: string, nextDescription: string) => {
      if (!isHistoryAuthenticated) return;

      const trimmedTitle = nextTitle.trim();
      const trimmedDescription = nextDescription.trim();
      if (!trimmedTitle && !trimmedDescription) {
        if (selectedDraftId) {
          setDraftHistoryItems((current) =>
            current.filter((draft) => draft.id !== selectedDraftId),
          );
        } else {
          setDraftHistoryItems([]);
        }
        setSelectedDraftId(null);
        if (selectedHistoryId === "draft") {
          setSelectedHistoryId(null);
        }
        return;
      }

      const nextDraft = {
        id:
          selectedHistoryId === "draft" && selectedDraftId
            ? selectedDraftId
            : `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: nextTitle,
        description: nextDescription,
        updatedAt: new Date().toISOString(),
      };

      if (selectedHistoryId === "draft" && selectedDraftId) {
        setDraftHistoryItems((current) =>
          current.map((draft) =>
            draft.id === selectedDraftId ? nextDraft : draft,
          ),
        );
      } else {
        setDraftHistoryItems((current) => [...current, nextDraft]);
        setSelectedHistoryId("draft");
        setSelectedDraftId(nextDraft.id);
      }
    },
    [isHistoryAuthenticated, selectedDraftId, selectedHistoryId],
  );

  const onSelectHistoryItem = useCallback(
    (item: GenerationHistoryItem) => {
      if (item.isDraft) {
        markUserInteraction();
        clearRevealTimer();
        clearDemoTimer();
        setSelectedHistoryId("draft");
        setSelectedDraftId(item.id);
        setTitle(item.title);
        setDescription(item.description);
        revealDescriptionWithoutAnimation();
        setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
        setPaywall(null);
        setIsUnlockingFromPaywall(false);
        setUnlockReadyContext(null);
        setConfirmModalMode(null);
        setIsGenerating(false);
        setEntitlementUsed(null);
        setCurrentGenerationId(null);
        setCurrentGenerationFeedback(null);
        setApiTags([]);
        setVisibleTags([]);
        setShouldAnimateTagChips(false);
        setClearPhase("idle");
        setShellHeightTransitionMs(0);
        setShellHeightPx(null);
        showToast(toastMessages.historyLoaded);
        return;
      }

      markUserInteraction();
      setSelectedHistoryId(item.id);
      setSelectedDraftId(null);
      setTitle(item.title);
      setDescription(item.description);
      revealDescriptionWithoutAnimation();
      setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
      setPaywall(null);
      setIsUnlockingFromPaywall(false);
      setUnlockReadyContext(null);
      setConfirmModalMode(null);
      setCurrentGenerationId(item.id);
      setCurrentGenerationFeedback(item.feedback ?? null);
      setResultTagsImmediately(item.targetTags, item.discoveryTags);
      showToast(toastMessages.historyLoaded);
    },
    [
      clearDemoTimer,
      clearRevealTimer,
      markUserInteraction,
      revealDescriptionWithoutAnimation,
      setResultTagsImmediately,
      showToast,
    ],
  );

  const deleteDraftItem = useCallback(
    (draftId: string) => {
      if (!draftId) {
        return;
      }

      setDraftHistoryItems((current) =>
        current.filter((draft) => draft.id !== draftId),
      );
      setSelectedDraftId((current) => (current === draftId ? null : current));

      if (selectedHistoryId === "draft" && selectedDraftId === draftId) {
        setSelectedHistoryId(null);
        setTitle("");
        setDescription("");
        setDescriptionRevealMode("none");
        setShowDescription(false);
        setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
        setApiTags([]);
        setVisibleTags([]);
        setShouldAnimateTagChips(false);
        setPaywall(null);
        setUnlockReadyContext(null);
        setConfirmModalMode(null);
        setIsUnlockingFromPaywall(false);
        setCurrentGenerationId(null);
        setCurrentGenerationFeedback(null);
      }
    },
    [selectedDraftId, selectedHistoryId],
  );

  const archiveGenerationItem = useCallback(
    async (item: GenerationHistoryItem) => {
      const archivedAt = await archiveGeneration(item.id);
      setHistoryItems((current) =>
        current.map((historyItem) =>
          historyItem.id === item.id
            ? { ...historyItem, archivedAt }
            : historyItem,
        ),
      );
    },
    [],
  );

  const restoreGenerationItem = useCallback(
    async (item: GenerationHistoryItem) => {
      await restoreGeneration(item.id);
      setHistoryItems((current) =>
        current.map((historyItem) =>
          historyItem.id === item.id
            ? { ...historyItem, archivedAt: null }
            : historyItem,
        ),
      );
    },
    [],
  );

  const setFeedbackForGenerationInHistory = useCallback(
    (generationId: string, feedback: GenerationFeedback | null) => {
      setHistoryItems((current) =>
        current.map((item) =>
          item.id === generationId ? { ...item, feedback } : item,
        ),
      );
    },
    [],
  );

  // === Feedback ===
  const onGenerationFeedbackUp = useCallback(async () => {
    if (!currentGenerationId || isGenerationFeedbackSaving) return;
    const previous = currentGenerationFeedback;
    setIsGenerationFeedbackSaving(true);
    try {
      if (currentGenerationFeedback?.rating === "up") {
        setCurrentGenerationFeedback(null);
        setFeedbackForGenerationInHistory(currentGenerationId, null);
        await saveGenerationFeedback({
          action: "clear",
          generationId: currentGenerationId,
        });
        return;
      }
      setCurrentGenerationFeedback({ rating: "up", note: null });
      setFeedbackForGenerationInHistory(currentGenerationId, {
        rating: "up",
        note: null,
      });
      const feedback = await saveGenerationFeedback({
        action: "set",
        generationId: currentGenerationId,
        rating: "up",
      });
      setCurrentGenerationFeedback(feedback ?? { rating: "up", note: null });
      setFeedbackForGenerationInHistory(currentGenerationId, feedback ?? { rating: "up", note: null });
    } catch {
      setCurrentGenerationFeedback(previous);
      setFeedbackForGenerationInHistory(currentGenerationId, previous);
      showToast(toastMessages.generationFeedbackFailed);
    } finally {
      setIsGenerationFeedbackSaving(false);
    }
  }, [
    currentGenerationFeedback,
    currentGenerationId,
    isGenerationFeedbackSaving,
    setFeedbackForGenerationInHistory,
    showToast,
  ]);

  const onGenerationFeedbackDown = useCallback(async () => {
    if (!currentGenerationId || isGenerationFeedbackSaving) return;
    const previous = currentGenerationFeedback;
    if (currentGenerationFeedback?.rating === "down") {
      setIsGenerationFeedbackSaving(true);
      try {
        setCurrentGenerationFeedback(null);
        setFeedbackForGenerationInHistory(currentGenerationId, null);
        await saveGenerationFeedback({
          action: "clear",
          generationId: currentGenerationId,
        });
      } catch {
        setCurrentGenerationFeedback(previous);
        setFeedbackForGenerationInHistory(currentGenerationId, previous);
        showToast(toastMessages.generationFeedbackFailed);
      } finally {
        setIsGenerationFeedbackSaving(false);
      }
      return;
    }

    setCurrentGenerationFeedback({ rating: "down", note: null });
    setFeedbackForGenerationInHistory(currentGenerationId, {
      rating: "down",
      note: null,
    });
    generationDownvotePreviousFeedbackRef.current = previous;
    setIsGenerationDownvoteModalOpen(true);
  }, [
    currentGenerationFeedback,
    currentGenerationId,
    isGenerationFeedbackSaving,
    setFeedbackForGenerationInHistory,
    showToast,
  ]);

  const submitGenerationDownvote = useCallback(
    async (note: string) => {
      if (!currentGenerationId || isGenerationFeedbackSaving) return;
      const previous = generationDownvotePreviousFeedbackRef.current ?? currentGenerationFeedback;
      setIsGenerationFeedbackSaving(true);
      try {
        setCurrentGenerationFeedback({ rating: "down", note: note || null });
        setFeedbackForGenerationInHistory(currentGenerationId, {
          rating: "down",
          note: note || null,
        });
        const feedback = await saveGenerationFeedback({
          action: "set",
          generationId: currentGenerationId,
          rating: "down",
          note,
        });
        setCurrentGenerationFeedback(
          feedback ?? { rating: "down", note: note || null },
        );
        setFeedbackForGenerationInHistory(
          currentGenerationId,
          feedback ?? { rating: "down", note: note || null },
        );
      } catch {
        setCurrentGenerationFeedback(previous);
        setFeedbackForGenerationInHistory(currentGenerationId, previous);
        showToast(toastMessages.generationFeedbackFailed);
      } finally {
        generationDownvotePreviousFeedbackRef.current = null;
        setIsGenerationFeedbackSaving(false);
      }
    },
    [
      currentGenerationFeedback,
      currentGenerationId,
      isGenerationFeedbackSaving,
      setFeedbackForGenerationInHistory,
      showToast,
    ],
  );

  const confirmHistoryAction = useCallback(async () => {
    if (!historyConfirmAction) return;

    if (historyConfirmAction.type === "delete-draft") {
      deleteDraftItem(historyConfirmAction.item.id);
      setHistoryConfirmAction(null);
      return;
    }

    try {
      if (historyConfirmAction.type === "restore-generation") {
        await restoreGenerationItem(historyConfirmAction.item);
      } else {
        await archiveGenerationItem(historyConfirmAction.item);
      }
      setHistoryConfirmAction(null);
    } catch (err) {
      if (historyConfirmAction.type === "restore-generation") {
        showToast(toastMessages.historyRestoreFailed);
      } else {
        showToast({
          title: "Archive failed",
          body:
            err instanceof Error
              ? err.message
              : "Could not archive generation. Please try again.",
          type: "danger",
        });
      }
    }
  }, [
    archiveGenerationItem,
    deleteDraftItem,
    historyConfirmAction,
    restoreGenerationItem,
    showToast,
  ]);

  const cycleHistorySort = useCallback(
    (key: HistorySortKey) => {
      if (key === "status") {
        if (showArchivedHistory) {
          setShowArchivedHistory(false);
          setHistorySortState(null);
          return;
        }
        if (!historySortState || historySortState.key !== "status") {
          setHistorySortState({ key, direction: "asc" });
          return;
        }
        if (historySortState.direction === "asc") {
          setHistorySortState({ key, direction: "desc" });
          return;
        }
        setHistorySortState(null);
        setShowArchivedHistory(true);
        return;
      }

      setShowArchivedHistory(false);
      setHistorySortState((current) => {
        if (key === "date") {
          if (!current || current.key !== "date")
            return { key, direction: "desc" };
          if (current.direction === "desc") return { key, direction: "asc" };
          return null;
        }
        if (!current || current.key !== key) return { key, direction: "asc" };
        if (current.direction === "asc") return { key, direction: "desc" };
        return null;
      });
    },
    [historySortState, showArchivedHistory],
  );

  const showHistoryMode = useCallback(() => {
    const shellHeight = shellRef.current?.getBoundingClientRect().height;
    if (typeof shellHeight === "number" && Number.isFinite(shellHeight)) {
      setHistoryShellHeightPx(Math.round(shellHeight));
    }
    setHistoryMode("history");
  }, []);

  const showGeneratorMode = useCallback(() => {
    setSkipGeneratorReturnAnimations(true);
    setHistoryMode("generator");
    setHistoryShellHeightPx(null);
  }, []);

  useEffect(() => {
    if (historyMode !== "generator" || !skipGeneratorReturnAnimations) return;

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setSkipGeneratorReturnAnimations(false);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [historyMode, skipGeneratorReturnAnimations]);

  const handleCopyAll = async () => {
    markUserInteraction();
    const allTags = visibleTags;

    if (!allTags.length || paywall) return;

    await navigator.clipboard.writeText(allTags.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalTags = visibleTags.length;
  const showResults =
    totalTags > 0 || isUnlockingFromPaywall || Boolean(paywall);
  const areAllTagsVisible =
    apiTags.length > 0 && visibleTags.length === apiTags.length;
  const shouldRevealTagChips =
    shouldAnimateTagChips && !skipGeneratorReturnAnimations;
  const canCopyAll = !paywall && !isUnlockingFromPaywall && areAllTagsVisible;
  const showGenerationFeedbackControls =
    !isDemoActive &&
    isHistoryAuthenticated &&
    Boolean(currentGenerationId) &&
    totalTags > 0 &&
    !paywall &&
    !isUnlockingFromPaywall;
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
  const canSwitchHistoryMode = !isDemoActive && isHistoryAuthenticated;
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
        data-history-height-locked={
          historyMode === "history" && historyShellHeightPx !== null
            ? "true"
            : "false"
        }
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={cn(
          "relative rounded-2xl",
          historyMode === "history" ? "overflow-hidden" : "overflow-visible",
        )}
        style={{
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: "1px solid rgba(255,255,255,0.92)",
          boxShadow:
            "0 24px 84px rgba(249,115,22,0.24), 0 12px 52px rgba(168,85,247,0.18), 0 1px 0 rgba(255,255,255,0.92) inset",
          height:
            historyMode === "history"
              ? (historyShellHeightPx ?? shellHeightPx ?? undefined)
              : (shellHeightPx ?? undefined),
          transition:
            shellHeightPx !== null
              ? `height ${shellHeightTransitionMs}ms ease-out`
              : undefined,
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          {activeSheenId ? (
            <motion.div
              key={activeSheenId}
              initial={{ x: "-120%", opacity: 0 }}
              animate={{ x: "170%", opacity: [0, 0.9, 0] }}
              transition={{ duration: 0.95, ease: "easeInOut" }}
              onAnimationComplete={() => setActiveSheenId(null)}
              className="absolute inset-y-0 left-0 z-20 w-2/5 -skew-x-12"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.78) 45%, rgba(255,255,255,0) 100%)",
              }}
            />
          ) : null}
        </div>

        <div
          ref={contentRef}
          className="relative z-10 flex h-full min-h-0 flex-col p-6 sm:p-8"
        >
          <div className="mb-6 flex shrink-0 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
              {historyMode === "history" ? (
                <Clock className="h-3.5 w-3.5 text-white" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-white" />
              )}
            </div>
            <span className="text-sm font-semibold text-stone-700">
              {historyMode === "history"
                ? "Generation History"
                : "Tagloom Generator"}
            </span>
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
                      aria-describedby={
                        isUsageHintOpen ? "usage-hint-tooltip" : undefined
                      }
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
                              New accounts get 1 free generation. You can
                              purchase more generations in the{" "}
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
                          {usageLabel.toLowerCase().includes("/100") &&
                          monthlyResetDateText ? (
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
            {canSwitchHistoryMode ? (
              <HistoryModeToggle
                historyMode={historyMode}
                onToggle={() =>
                  historyMode === "history"
                    ? showGeneratorMode()
                    : showHistoryMode()
                }
                className={usageLabel ? undefined : "ml-auto"}
              />
            ) : null}
          </div>

          <div
            className={cn(
              "min-h-0 flex-1",
              historyMode === "history" ? "overflow-hidden" : "overflow-visible",
            )}
          >
            {historyMode === "generator" ? (
              <div
                data-testid="generator-scroll-panel"
                className="overflow-visible"
              >
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
                  <div
                    data-testid="title-focus-gutter"
                    className="-mx-1 px-1 pb-1"
                  >
                    <input
                      ref={titleInputRef}
                      type="text"
                      maxLength={TITLE_MAX}
                      value={title}
                      onFocus={() => {
                        if (isDemoActive) {
                          beginDemoInteraction();
                          return;
                        }
                        markUserInteraction();
                        revealDescriptionFromFocus();
                        setFocusedField("title");
                        if (onFocus) onFocus();
                      }}
                      onBlur={() => {
                        setFocusedField(null);
                      }}
                      onChange={(e) => {
                        markUserInteraction();
                        const nextTitle = e.target.value;
                        setTitle(nextTitle);
                        syncDraftFromUserInput(nextTitle, description);
                        if (nextTitle.length > 0) {
                          setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
                        }
                      }}
                      placeholder={titlePlaceholder}
                      className="w-full rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {showDescription && (
                    <motion.div
                      data-skip-generator-return-animations={
                        skipGeneratorReturnAnimations ? "true" : "false"
                      }
                      data-description-animation={
                        descriptionRevealMode === "first-focus" &&
                        !skipGeneratorReturnAnimations
                          ? "enter"
                          : "none"
                      }
                      initial={
                        descriptionRevealMode === "first-focus" &&
                        !skipGeneratorReturnAnimations
                          ? { height: 0, opacity: 0 }
                          : false
                      }
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      onAnimationComplete={() => {
                        if (descriptionRevealMode === "first-focus") {
                          setDescriptionRevealMode("none");
                        }
                      }}
                      className="mb-3 overflow-visible"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-sm font-medium text-stone-700">
                          Listing Description
                        </label>
                        {focusedField === "description" ? (
                          <span className="text-xs font-medium text-stone-500">
                            {description.length}/{DESCRIPTION_MAX}
                          </span>
                        ) : null}
                      </div>
                      <div
                        data-testid="description-focus-gutter"
                        className="-mx-1 px-1 pb-1"
                      >
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
                            const nextDescription = e.target.value;
                            setDescription(nextDescription);
                            syncDraftFromUserInput(title, nextDescription);
                          }}
                          placeholder="Add more details about your product to get more accurate tags..."
                          rows={3}
                          className="w-full resize-none rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="pb-2">
                  <Button
                    onClick={() => {
                      if (isDemoActive) {
                        beginDemoInteraction();
                        return;
                      }
                      void handleGenerate();
                    }}
                    disabled={isGenerating || !title.trim()}
                    isLoading={isGenerating}
                    loadingLabel="Generating tags"
                    leftIcon={<Sparkles className="h-4 w-4" />}
                    className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                      hasTitle
                        ? "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                        : "bg-gray-300"
                    }`}
                    style={{
                      boxShadow: title.trim()
                        ? "0 4px 20px rgba(249,115,22,0.35)"
                        : "none",
                    }}
                  >
                    Generate 13 tags
                  </Button>
                </div>

                <TurnstileField
                  ref={turnstileRef}
                  onError={(message) =>
                    showToast({
                      ...toastMessages.botCheckFailed,
                      body: message,
                    })
                  }
                />
                <AnimatePresence>
                  {showResults && (
                    <motion.div
                      data-testid="results-block"
                      data-results-animation={
                        skipGeneratorReturnAnimations ? "none" : "enter"
                      }
                      initial={
                        skipGeneratorReturnAnimations
                          ? false
                          : { opacity: 0, y: 8 }
                      }
                      animate={
                        isClearingFade
                          ? { opacity: 0, y: 10 }
                          : { opacity: 1, y: 0 }
                      }
                      transition={{
                        duration: isClearingFade ? 0.16 : 0.22,
                        ease: "easeOut",
                      }}
                      className="mt-6"
                    >
                      {!isUnlockingFromPaywall ? (
                        <div className="mb-3 flex items-center justify-between">
                          <span
                            data-testid="generated-tag-count"
                            className="text-sm font-medium text-stone-700"
                          >
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
                            {copied ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copied ? "Copied!" : "Copy all"}
                          </button>
                        </div>
                      ) : null}

                      {isUnlockingFromPaywall ? (
                        <div className="mt-3 flex flex-col items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white/70 py-8">
                          <div className="relative h-12 w-12">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                              className="absolute inset-0 rounded-full border-2 border-orange-200 border-t-orange-500"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <LockOpen className="h-5 w-5 text-orange-600" />
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-stone-700">
                            Unlocking tags
                          </p>
                        </div>
                      ) : paywall?.reason === "auth_required" &&
                        unlockReadyContext ? (
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
                        <div
                          className={`flex flex-wrap items-center gap-2 ${paywall ? "blur-sm select-none" : ""}`}
                        >
                          {visibleTags.map((tag, i) =>
                            shouldRevealTagChips ? (
                              <motion.span
                                key={`${tag}-${i}`}
                                data-testid="generated-tag-chip"
                                data-animation="reveal"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                  delay: i * 0.04,
                                  type: "spring",
                                  stiffness: 300,
                                  damping: 20,
                                }}
                                className={GENERATED_TAG_CHIP_CLASSNAME}
                              >
                                {tag}
                              </motion.span>
                            ) : (
                              <span
                                key={`${tag}-${i}`}
                                data-testid="generated-tag-chip"
                                data-animation="none"
                                className={GENERATED_TAG_CHIP_CLASSNAME}
                              >
                                {tag}
                              </span>
                            ),
                          )}
                          {showGenerationFeedbackControls ? (
                            <div className="ml-auto flex items-center justify-end">
                              <FeedbackButtons
                                rating={currentGenerationFeedback?.rating ?? null}
                                disabled={isGenerationFeedbackSaving}
                                onUp={() => {
                                  void onGenerationFeedbackUp();
                                }}
                                onDown={() => {
                                  void onGenerationFeedbackDown();
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      )}

                      {paywall &&
                      !(
                        paywall.reason === "auth_required" && unlockReadyContext
                      ) ? (
                        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                          {paywall.reason === "auth_required" ? (
                            <div className="space-y-3 text-center">
                              {!unlockReadyContext ? (
                                <>
                                  <p className="text-sm font-semibold text-orange-800">
                                    Create an account or log in to unlock this
                                    generation for FREE
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
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-1 overflow-hidden">
                <HistoryPanel
                  items={displayHistoryItems}
                  selectedDraftId={selectedDraftId}
                  selectedGeneratedId={
                    selectedHistoryId === "draft" ? null : selectedHistoryId
                  }
                  showArchived={showArchivedHistory}
                  sortState={historySortState}
                  onArchiveGeneration={(item) =>
                    setHistoryConfirmAction({
                      type: "archive-generation",
                      item,
                    })
                  }
                  onRestoreGeneration={(item) =>
                    setHistoryConfirmAction({
                      type: "restore-generation",
                      item,
                    })
                  }
                  onDeleteDraft={(item) =>
                    setHistoryConfirmAction({ type: "delete-draft", item })
                  }
                  onSelectItem={onSelectHistoryItem}
                  onSortHeaderClick={cycleHistorySort}
                />
              </div>
            )}
          </div>
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

      <FeedbackModal
        open={isGenerationDownvoteModalOpen}
        title="What went wrong with these tags?"
        placeholder="Please tell us what went wrong with these tags so we can improve future tags."
        initialNote={
          currentGenerationFeedback?.rating === "down"
            ? currentGenerationFeedback.note
            : ""
        }
        isSubmitting={isGenerationFeedbackSaving}
        onCloseWithoutNote={() => {
          setIsGenerationDownvoteModalOpen(false);
          void submitGenerationDownvote("");
        }}
        onSubmit={(note) => {
          setIsGenerationDownvoteModalOpen(false);
          void submitGenerationDownvote(note);
        }}
      />

      <AnimatePresence>
        {historyConfirmAction ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <button
              type="button"
              aria-label="Cancel history action"
              className="absolute inset-0 bg-stone-900/45"
              onClick={() => setHistoryConfirmAction(null)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className="relative z-10 w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 6 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <h3 className="text-base font-semibold text-stone-900">
                {historyConfirmAction.type === "delete-draft"
                  ? "Delete draft?"
                  : historyConfirmAction.type === "restore-generation"
                    ? "Restore generation?"
                    : "Archive generation?"}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {historyConfirmAction.type === "delete-draft"
                  ? "This removes the draft from this browser."
                  : historyConfirmAction.type === "restore-generation"
                    ? "This moves the generation back into normal history."
                    : "This hides the generation from normal history without deleting it from your account."}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void confirmHistoryAction()}
                  className="w-full rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-3.5 py-2 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
                >
                  {historyConfirmAction.type === "delete-draft"
                    ? "Delete draft"
                    : historyConfirmAction.type === "restore-generation"
                      ? "Restore generation"
                      : "Archive generation"}
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryConfirmAction(null)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

// === Components ===

function HistoryModeToggle({
  historyMode,
  onToggle,
  className,
}: {
  historyMode: HistoryMode;
  onToggle: () => void;
  className?: string;
}) {
  const isHistory = historyMode === "history";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isHistory ? "Show generator" : "Show generation history"}
      aria-pressed={isHistory}
      className={cn(
        "relative inline-flex h-[36px] w-[64px] items-center rounded-full border border-stone-200 bg-white/85 p-[3px] transition-colors hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300/70",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="absolute left-[3px] top-[3px] flex h-7 w-7 items-center justify-center"
      >
        <Sparkles className="h-3.5 w-3.5 text-stone-500 opacity-50" />
      </span>
      <span
        aria-hidden="true"
        className="absolute left-[31px] top-[3px] flex h-7 w-7 items-center justify-center"
      >
        <Clock className="h-3.5 w-3.5 text-stone-500 opacity-50" />
      </span>
      <motion.span
        aria-hidden="true"
        className="absolute left-[3px] top-[3px] flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm"
        animate={{ x: isHistory ? 28 : 0 }}
        transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
      >
        {isHistory ? (
          <Clock className="h-3.5 w-3.5 text-white" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-white" />
        )}
      </motion.span>
    </button>
  );
}
