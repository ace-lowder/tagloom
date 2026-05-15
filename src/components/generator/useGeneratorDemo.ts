"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import { GENERATOR_CTA_EVENT } from "@/lib/generatorCta";
import { sanitizeMergedTags } from "./generatorTags";
import {
  CTA_SCROLL_CORRECTION_DELAY_MS,
  DEFAULT_DEMO_TIMINGS,
  DEFAULT_TITLE_PLACEHOLDER,
  DEMO_FIXTURES,
} from "./generatorConstants";
import type {
  ClearPhase,
  DescriptionRevealMode,
  DemoPhase,
  DemoTimings,
  GeneratorProps,
} from "./generatorTypes";
import { usePausableTimer } from "./usePausableTimer";

export function useGeneratorDemo({
  demoConfig,
  onFocus,
  shellRef,
  contentRef,
  titleInputRef,
  showDescription,
  skipGeneratorReturnAnimations,
  clearRevealTimer,
  pauseRevealTimer,
  resumeRevealTimer,
  resetGenerationState,
  clearVisibleResults,
  setResultTags,
  setTitle,
  setDescription,
  setTitlePlaceholder,
  setShowDescription,
  setDescriptionRevealMode,
  setFocusedField,
}: UseGeneratorDemoParams) {
  const [activeSheenId, setActiveSheenId] = useState<number | null>(null);
  const [isDemoActive, setIsDemoActive] = useState(true);
  const [isDemoGenerating, setIsDemoGenerating] = useState(false);
  const [, setDemoPhase] = useState<DemoPhase>("typing");
  const [clearPhase, setClearPhase] = useState<ClearPhase>("idle");
  const [shellHeightPx, setShellHeightPx] = useState<number | null>(null);
  const [shellHeightTransitionMs, setShellHeightTransitionMs] = useState(0);

  const collapseRafRef = useRef<number | null>(null);
  const ctaScrollCorrectionTimeoutRef = useRef<number | null>(null);
  const demoFixtureIndexRef = useRef(0);
  const demoCharIndexRef = useRef(0);
  const shouldSkipDemoRef = useRef(false);
  const hasPlayedFirstDescriptionRevealRef = useRef(false);
  const isDemoPausedRef = useRef(false);

  const {
    setTimer: setDemoTimer,
    pauseTimer: pauseDemoTimer,
    resumeTimer: resumeDemoTimer,
    clearTimer: clearDemoTimerBase,
  } = usePausableTimer();

  const clearDemoTimer = useCallback(() => {
    clearDemoTimerBase();
    if (collapseRafRef.current) {
      cancelAnimationFrame(collapseRafRef.current);
      collapseRafRef.current = null;
    }
  }, [clearDemoTimerBase]);

  const markUserInteraction = useCallback(() => {
    if (!isDemoActive) return;
    isDemoPausedRef.current = false;
    setIsDemoActive(false);
    clearDemoTimer();
    clearRevealTimer();
    setIsDemoGenerating(false);
    setDemoPhase("typing");
    setClearPhase("idle");
    setShellHeightTransitionMs(0);
    setShellHeightPx(null);
    clearVisibleResults();
    resetGenerationState();
  }, [
    clearDemoTimer,
    clearRevealTimer,
    clearVisibleResults,
    isDemoActive,
    resetGenerationState,
  ]);

  const playSheen = useCallback(() => {
    setActiveSheenId(Date.now());
  }, []);

  const onSheenAnimationComplete = useCallback(() => {
    setActiveSheenId(null);
  }, []);

  const focusTitleInput = useCallback(() => {
    window.setTimeout(() => {
      titleInputRef.current?.focus({ preventScroll: true });
      titleInputRef.current?.select();
    }, 20);
  }, [titleInputRef]);

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
  }, [
    setDescriptionRevealMode,
    setShowDescription,
    showDescription,
    skipGeneratorReturnAnimations,
  ]);

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
    setFocusedField,
    setTitle,
    setTitlePlaceholder,
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
  }, [focusTitleInput, playSheen, revealDescriptionFromFocus, scheduleCtaScrollCorrection]);

  useEffect(() => {
    if (!isDemoActive || shouldSkipDemoRef.current) return;

    clearDemoTimer();
    clearRevealTimer();
    const resetDemoVisualState = () => {
      setDemoPhase("typing");
      setIsDemoGenerating(false);
      resetGenerationState();
      setDescription("");
      setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
      setClearPhase("idle");
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
          setIsDemoGenerating(true);

          setDemoTimer(() => {
            if (!isDemoActive || shouldSkipDemoRef.current) return;
            setIsDemoGenerating(false);
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
                clearVisibleResults();
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
    clearVisibleResults,
    contentRef,
    demoFixtures,
    demoTimings,
    isDemoActive,
    resetGenerationState,
    setDemoTimer,
    setDescription,
    setResultTags,
    setTitle,
    setTitlePlaceholder,
    shellRef,
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
    shellRef,
  ]);

  useEffect(() => {
    return () => {
      clearDemoTimer();
      if (ctaScrollCorrectionTimeoutRef.current) {
        clearTimeout(ctaScrollCorrectionTimeoutRef.current);
      }
    };
  }, [clearDemoTimer]);

  return {
    activeSheenId,
    isDemoActive,
    setIsDemoActive,
    isDemoGenerating,
    clearPhase,
    setClearPhase,
    shellHeightPx,
    setShellHeightPx,
    shellHeightTransitionMs,
    setShellHeightTransitionMs,
    shouldSkipDemoRef,
    revealStepMs: demoTimings.revealStepMs,
    markUserInteraction,
    playSheen,
    beginDemoInteraction,
    clearDemoTimer,
    revealDescriptionFromFocus,
    onSheenAnimationComplete,
  };
}

type UseGeneratorDemoParams = {
  demoConfig: GeneratorProps["demoConfig"];
  onFocus?: () => void;
  shellRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  titleInputRef: RefObject<HTMLInputElement | null>;
  showDescription: boolean;
  skipGeneratorReturnAnimations: boolean;
  clearRevealTimer: () => void;
  pauseRevealTimer: () => void;
  resumeRevealTimer: () => void;
  resetGenerationState: () => void;
  clearVisibleResults: () => void;
  setResultTags: (target: string[], discovery: string[]) => void;
  setTitle: Dispatch<SetStateAction<string>>;
  setDescription: Dispatch<SetStateAction<string>>;
  setTitlePlaceholder: Dispatch<SetStateAction<string>>;
  setShowDescription: Dispatch<SetStateAction<boolean>>;
  setDescriptionRevealMode: Dispatch<SetStateAction<DescriptionRevealMode>>;
  setFocusedField: Dispatch<SetStateAction<"title" | "description" | null>>;
};
