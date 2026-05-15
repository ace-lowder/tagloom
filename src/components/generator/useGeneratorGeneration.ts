"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { TurnstileFieldHandle } from "@/components/security/TurnstileField";
import type { ToastInput } from "@/components/toasts/toasts";
import { toastMessages } from "@/components/toasts/toastMessages";
import { clearPendingContext, generateContextId, savePendingContext } from "./generatorStorage";
import { requestGeneration } from "./generatorApi";
import { DEFAULT_TITLE_PLACEHOLDER } from "./generatorConstants";
import type { ClearPhase, DescriptionRevealMode, PaywallState } from "./generatorTypes";
import { useGenerationAccess } from "./useGenerationAccess";

// === Hooks ===

export function useGeneratorGeneration({
  form,
  result,
  demo,
  layout,
  usage,
  history,
  feedback,
  auth,
  turnstile,
}: UseGeneratorGenerationParams) {
  const { title, description } = form;
  const { clearCurrentGenerationFeedback } = feedback;
  const { removeSelectedDraftAfterGeneration, setSelectedHistoryId, loadHistory } =
    history;
  const { setResultTags, resetResultTags, clearRevealTimer, getVisibleTagsLength } =
    result;
  const { refreshUsageLabel, usageLabel } = usage;
  const { openAuthModal, showToast } = auth;
  const { markUserInteraction, playSheen, clearDemoTimer, setIsDemoActive, shouldSkipDemoRef } =
    demo;
  const { setClearPhase, setShellHeightPx, setShellHeightTransitionMs } = layout;
  const { enabled: turnstileEnabled, ref: turnstileRef } = turnstile;
  const {
    setTitle,
    setDescription,
    setShowDescription,
    setDescriptionRevealMode,
    setTitlePlaceholder,
  } = form;
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(
    null,
  );
  const [paywall, setPaywall] = useState<PaywallState | null>(null);
  const [isUnlockingFromPaywall, setIsUnlockingFromPaywall] = useState(false);
  const [confirmModalMode, setConfirmModalMode] = useState<
    "unlock" | "generate" | null
  >(null);

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
        setCurrentGenerationId(null);
        clearCurrentGenerationFeedback();
        setResultTags(data.placeholders.target, data.placeholders.discovery);
        return;
      }

      setCurrentGenerationId(data.generationId);
      clearCurrentGenerationFeedback();
      removeSelectedDraftAfterGeneration();
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
      clearCurrentGenerationFeedback,
      setResultTags,
      removeSelectedDraftAfterGeneration,
      setSelectedHistoryId,
      refreshUsageLabel,
      loadHistory,
    ],
  );

  const {
    generationContextId,
    setGenerationContextId,
    unlockReadyContext,
    setUnlockReadyContext,
    goToLogin,
    goToPricing,
    onUnlockTags,
    beginUnlockFromContext,
  } = useGenerationAccess({
    title,
    description,
    paywall,
    getVisibleTagsLength,
    openAuthModal,
    showToast,
    markUserInteraction,
    playSheen,
    clearDemoTimer,
    clearRevealTimer,
    resetResultTags,
    setTitle,
    setDescription,
    setShowDescription,
    setDescriptionRevealMode,
    setTitlePlaceholder,
    setIsDemoActive,
    shouldSkipDemoRef,
    refreshUsageLabel,
    loadHistory,
    runGeneration,
    setPaywall,
    setIsUnlockingFromPaywall,
    setConfirmModalMode,
  });

  const resetGenerationState = useCallback(() => {
    setIsGenerating(false);
    setCurrentGenerationId(null);
    setPaywall(null);
    setIsUnlockingFromPaywall(false);
    setUnlockReadyContext(null);
    setConfirmModalMode(null);
    clearCurrentGenerationFeedback();
    resetResultTags();
  }, [clearCurrentGenerationFeedback, resetResultTags, setUnlockReadyContext]);

  const executeGenerate = useCallback(async () => {
    markUserInteraction();
    if (!title.trim()) return;

    clearRevealTimer();
    setIsGenerating(true);
    setCurrentGenerationId(null);
    clearCurrentGenerationFeedback();
    setPaywall(null);
    setIsUnlockingFromPaywall(false);
    setUnlockReadyContext(null);
    setConfirmModalMode(null);
    setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
    resetResultTags();
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
    clearCurrentGenerationFeedback,
    clearRevealTimer,
    description,
    generationContextId,
    markUserInteraction,
    runGeneration,
    resetResultTags,
    setClearPhase,
    setGenerationContextId,
    setShellHeightPx,
    setShellHeightTransitionMs,
    setTitlePlaceholder,
    setUnlockReadyContext,
    showToast,
    title,
    turnstileEnabled,
    turnstileRef,
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

  const isFreeUsageHint = usageLabel?.toLowerCase().includes("free") ?? false;
  const showFreeGenerationModalTitle = confirmModalMode === "generate";

  return {
    isGenerating,
    currentGenerationId,
    setCurrentGenerationId,
    paywall,
    isUnlockingFromPaywall,
    unlockReadyContext,
    confirmModalMode,
    setConfirmModalMode,
    handleGenerate,
    goToLogin,
    goToPricing,
    onUnlockTags,
    confirmModalMessage,
    confirmModalAction,
    isFreeUsageHint,
    showFreeGenerationModalTitle,
    resetGenerationState,
  };
}

// === Types ===

type GenerationFormController = {
  title: string;
  description: string;
  setTitle: Dispatch<SetStateAction<string>>;
  setDescription: Dispatch<SetStateAction<string>>;
  setShowDescription: Dispatch<SetStateAction<boolean>>;
  setDescriptionRevealMode: Dispatch<SetStateAction<DescriptionRevealMode>>;
  setTitlePlaceholder: Dispatch<SetStateAction<string>>;
};

type GenerationResultController = {
  getVisibleTagsLength: () => number;
  clearRevealTimer: () => void;
  resetResultTags: () => void;
  setResultTags: (target: string[], discovery: string[]) => void;
};

type GenerationDemoController = {
  markUserInteraction: () => void;
  playSheen: () => void;
  clearDemoTimer: () => void;
  setIsDemoActive: Dispatch<SetStateAction<boolean>>;
  shouldSkipDemoRef: MutableRefObject<boolean>;
};

type GenerationLayoutController = {
  setClearPhase: Dispatch<SetStateAction<ClearPhase>>;
  setShellHeightPx: Dispatch<SetStateAction<number | null>>;
  setShellHeightTransitionMs: Dispatch<SetStateAction<number>>;
};

type GenerationUsageController = {
  usageLabel: string | null;
  refreshUsageLabel: () => Promise<{ usageLabel: string | null; resolved: boolean }>;
};

type GenerationHistoryController = {
  loadHistory: () => Promise<void>;
  removeSelectedDraftAfterGeneration: () => void;
  setSelectedHistoryId: Dispatch<SetStateAction<string | null>>;
};

type GenerationFeedbackController = {
  clearCurrentGenerationFeedback: () => void;
};

type GenerationAuthController = {
  openAuthModal: (options: {
    mode?: "login" | "signup";
    source?: string;
    next?: string;
  }) => void;
  showToast: (toast: ToastInput) => string;
};

type GenerationTurnstileController = {
  enabled: boolean;
  ref: RefObject<TurnstileFieldHandle | null>;
};

type UseGeneratorGenerationParams = {
  form: GenerationFormController;
  result: GenerationResultController;
  demo: GenerationDemoController;
  layout: GenerationLayoutController;
  usage: GenerationUsageController;
  history: GenerationHistoryController;
  feedback: GenerationFeedbackController;
  auth: GenerationAuthController;
  turnstile: GenerationTurnstileController;
};
