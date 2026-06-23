"use client";

import { useCallback, useRef, useState } from "react";
import { sanitizeMergedTags } from "./generatorTags";
import type { PaywallState } from "./generatorTypes";

// === Hooks ===

export function useGeneratedTags({
  paywall,
  isUnlockingFromPaywall,
  unlockReadyContext,
  skipGeneratorReturnAnimations,
  revealStepMs,
  markUserInteraction,
  setRevealTimer,
  clearRevealTimer,
}: UseGeneratedTagsParams) {
  const [apiTags, setApiTags] = useState<string[]>([]);
  const [visibleTags, setVisibleTags] = useState<string[]>([]);
  const [shouldAnimateTagChips, setShouldAnimateTagChips] = useState(false);
  const [copied, setCopied] = useState(false);
  const requestVersionRef = useRef(0);

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
          setRevealTimer(revealNext, revealStepMs);
        }
      };

      setRevealTimer(revealNext, revealStepMs);
    },
    [clearRevealTimer, revealStepMs, setRevealTimer],
  );

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

  const resetResultTags = useCallback(() => {
    requestVersionRef.current += 1;
    clearRevealTimer();
    setApiTags([]);
    setVisibleTags([]);
    setShouldAnimateTagChips(false);
  }, [clearRevealTimer]);

  const clearVisibleResults = useCallback(() => {
    resetResultTags();
  }, [resetResultTags]);

  const handleCopyAll = useCallback(async () => {
    markUserInteraction();
    const allTags = visibleTags;

    if (!allTags.length || paywall) return;

    await navigator.clipboard.writeText(allTags.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [markUserInteraction, paywall, visibleTags]);

  const totalTags = visibleTags.length;
  const showResults =
    totalTags > 0 ||
    isUnlockingFromPaywall ||
    Boolean(paywall) ||
    Boolean(unlockReadyContext);
  const areAllTagsVisible =
    apiTags.length > 0 && visibleTags.length === apiTags.length;
  const shouldRevealTagChips =
    shouldAnimateTagChips && !skipGeneratorReturnAnimations;
  const canCopyAll = !paywall && !isUnlockingFromPaywall && areAllTagsVisible;

  return {
    apiTags,
    visibleTags,
    shouldAnimateTagChips,
    copied,
    totalTags,
    showResults,
    shouldRevealTagChips,
    canCopyAll,
    setResultTags,
    setResultTagsImmediately,
    resetResultTags,
    clearVisibleResults,
    handleCopyAll,
  };
}

// === Types ===

type UseGeneratedTagsParams = {
  paywall: PaywallState | null;
  isUnlockingFromPaywall: boolean;
  unlockReadyContext: { id: string; title: string; description: string } | null;
  skipGeneratorReturnAnimations: boolean;
  revealStepMs: number;
  markUserInteraction: () => void;
  setRevealTimer: (callback: () => void, delayMs: number) => void;
  clearRevealTimer: () => void;
};
