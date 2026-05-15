"use client";

import { useCallback, useRef, useState } from "react";
import { toastMessages } from "@/components/toasts/toastMessages";
import type { ToastInput } from "@/components/toasts/toasts";
import { saveGenerationFeedback } from "./generatorApi";
import type { GenerationFeedback } from "./generatorTypes";

// === Hooks ===

export function useGeneratorFeedback({
  currentGenerationId,
  onHistoryFeedbackChange,
  showToast,
}: UseGeneratorFeedbackParams) {
  const [currentGenerationFeedback, setCurrentGenerationFeedback] =
    useState<GenerationFeedback | null>(null);
  const [isGenerationFeedbackSaving, setIsGenerationFeedbackSaving] =
    useState(false);
  const [isGenerationDownvoteModalOpen, setIsGenerationDownvoteModalOpen] =
    useState(false);
  const generationDownvotePreviousFeedbackRef =
    useRef<GenerationFeedback | null>(null);

  const onGenerationFeedbackUp = useCallback(async () => {
    if (!currentGenerationId || isGenerationFeedbackSaving) return;
    const previous = currentGenerationFeedback;
    setIsGenerationFeedbackSaving(true);
    try {
      if (currentGenerationFeedback?.rating === "up") {
        setCurrentGenerationFeedback(null);
        onHistoryFeedbackChange(currentGenerationId, null);
        await saveGenerationFeedback({
          action: "clear",
          generationId: currentGenerationId,
        });
        return;
      }
      setCurrentGenerationFeedback({ rating: "up", note: null });
      onHistoryFeedbackChange(currentGenerationId, {
        rating: "up",
        note: null,
      });
      const feedback = await saveGenerationFeedback({
        action: "set",
        generationId: currentGenerationId,
        rating: "up",
      });
      setCurrentGenerationFeedback(feedback ?? { rating: "up", note: null });
      onHistoryFeedbackChange(
        currentGenerationId,
        feedback ?? { rating: "up", note: null },
      );
    } catch {
      setCurrentGenerationFeedback(previous);
      onHistoryFeedbackChange(currentGenerationId, previous);
      showToast(toastMessages.generationFeedbackFailed);
    } finally {
      setIsGenerationFeedbackSaving(false);
    }
  }, [
    currentGenerationFeedback,
    currentGenerationId,
    isGenerationFeedbackSaving,
    onHistoryFeedbackChange,
    showToast,
  ]);

  const onGenerationFeedbackDown = useCallback(async () => {
    if (!currentGenerationId || isGenerationFeedbackSaving) return;
    const previous = currentGenerationFeedback;
    if (currentGenerationFeedback?.rating === "down") {
      setIsGenerationFeedbackSaving(true);
      try {
        setCurrentGenerationFeedback(null);
        onHistoryFeedbackChange(currentGenerationId, null);
        await saveGenerationFeedback({
          action: "clear",
          generationId: currentGenerationId,
        });
      } catch {
        setCurrentGenerationFeedback(previous);
        onHistoryFeedbackChange(currentGenerationId, previous);
        showToast(toastMessages.generationFeedbackFailed);
      } finally {
        setIsGenerationFeedbackSaving(false);
      }
      return;
    }

    setCurrentGenerationFeedback({ rating: "down", note: null });
    onHistoryFeedbackChange(currentGenerationId, {
      rating: "down",
      note: null,
    });
    generationDownvotePreviousFeedbackRef.current = previous;
    setIsGenerationDownvoteModalOpen(true);
  }, [
    currentGenerationFeedback,
    currentGenerationId,
    isGenerationFeedbackSaving,
    onHistoryFeedbackChange,
    showToast,
  ]);

  const submitGenerationDownvote = useCallback(
    async (note: string) => {
      if (!currentGenerationId || isGenerationFeedbackSaving) return;
      const previous =
        generationDownvotePreviousFeedbackRef.current ?? currentGenerationFeedback;
      setIsGenerationFeedbackSaving(true);
      try {
        setCurrentGenerationFeedback({ rating: "down", note: note || null });
        onHistoryFeedbackChange(currentGenerationId, {
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
        onHistoryFeedbackChange(
          currentGenerationId,
          feedback ?? { rating: "down", note: note || null },
        );
      } catch {
        setCurrentGenerationFeedback(previous);
        onHistoryFeedbackChange(currentGenerationId, previous);
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
      onHistoryFeedbackChange,
      showToast,
    ],
  );

  return {
    currentGenerationFeedback,
    setCurrentGenerationFeedback,
    isGenerationFeedbackSaving,
    isGenerationDownvoteModalOpen,
    setIsGenerationDownvoteModalOpen,
    onGenerationFeedbackUp,
    onGenerationFeedbackDown,
    submitGenerationDownvote,
  };
}

// === Types ===

type UseGeneratorFeedbackParams = {
  currentGenerationId: string | null;
  onHistoryFeedbackChange: (
    generationId: string,
    feedback: GenerationFeedback | null,
  ) => void;
  showToast: (toast: ToastInput) => string;
};
