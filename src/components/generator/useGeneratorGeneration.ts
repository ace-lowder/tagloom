"use client";

import { useCallback, useMemo, useState } from "react";
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { TurnstileFieldHandle } from "@/components/security/TurnstileField";
import type { ToastInput } from "@/components/toasts/toasts";
import { toastMessages } from "@/components/toasts/toastMessages";
import {
  clearPendingContext,
  clearPendingGuestGeneration,
  generateContextId,
  savePendingContext,
  savePendingGuestGeneration,
} from "./generatorStorage";
import { requestGeneration } from "./generatorApi";
import { DEFAULT_TITLE_PLACEHOLDER } from "./generatorConstants";
import type {
  ClearPhase,
  DescriptionRevealMode,
  GenerateOkResponse,
  GeneratePaywallResponse,
  PaywallState,
} from "./generatorTypes";
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
  const { setResultTags, resetResultTags, clearRevealTimer } = result;
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

  const applyPaywallState = useCallback(
    (data: GeneratePaywallResponse) => {
      setIsUnlockingFromPaywall(false);
      setPaywall({
        reason: data.reason,
        message: data.message,
        requestId: data.requestId,
      });
      setCurrentGenerationId(null);
      clearCurrentGenerationFeedback();
      setResultTags(data.placeholders.target, data.placeholders.discovery);
    },
    [clearCurrentGenerationFeedback, setResultTags],
  );

  const applySuccessfulGeneration = useCallback(
    (data: GenerateOkResponse, contextId: string) => {
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
      clearPendingGuestGeneration();
      clearResumeParams();
    },
    [
      clearCurrentGenerationFeedback,
      refreshUsageLabel,
      loadHistory,
      removeSelectedDraftAfterGeneration,
      setResultTags,
      setSelectedHistoryId,
    ],
  );

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
        applyPaywallState(data);
        return;
      }

      applySuccessfulGeneration(data, contextId);
    },
    [applyPaywallState, applySuccessfulGeneration],
  );

  const {
    generationContextId,
    setGenerationContextId,
    unlockReadyContext,
    setUnlockReadyContext,
    goToLogin,
    goToPricing,
    onUnlockTags,
  } = useGenerationAccess({
    title,
    description,
    openAuthModal,
    showToast,
    markUserInteraction,
    playSheen,
    clearDemoTimer,
    clearRevealTimer,
    setTitle,
    setDescription,
    setShowDescription,
    setDescriptionRevealMode,
    setTitlePlaceholder,
    setIsDemoActive,
    shouldSkipDemoRef,
    refreshUsageLabel,
    loadHistory,
    isHistoryAuthenticated: history.isHistoryAuthenticated,
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

  const resetBeforeGenerationRequest = useCallback(() => {
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
  }, [
    clearCurrentGenerationFeedback,
    clearRevealTimer,
    resetResultTags,
    setClearPhase,
    setShellHeightPx,
    setShellHeightTransitionMs,
    setTitlePlaceholder,
    setUnlockReadyContext,
  ]);

  const executeGenerate = useCallback(async () => {
    markUserInteraction();
    if (!title.trim()) return;

    resetBeforeGenerationRequest();

    const turnstile = await getTurnstileToken({
      enabled: turnstileEnabled,
      ref: turnstileRef,
      showToast,
    });
    if (!turnstile.ok) {
      setIsGenerating(false);
      return;
    }

    const contextId = prepareGenerationContext({
      currentContextId: generationContextId,
      title,
      description,
      setGenerationContextId,
    });

    try {
      await runGeneration(title, description, contextId, turnstile.token);
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
    description,
    generationContextId,
    markUserInteraction,
    resetBeforeGenerationRequest,
    runGeneration,
    setGenerationContextId,
    showToast,
    title,
    turnstileEnabled,
    turnstileRef,
  ]);

  const requiresFreeGenerationConfirmation = useMemo(() => {
    return isFreeGenerationConfirmationRequired(
      usageLabel,
      paywall,
      isUnlockingFromPaywall,
    );
  }, [isUnlockingFromPaywall, paywall, usageLabel]);

  const handleGenerate = useCallback(async () => {
    if (requiresFreeGenerationConfirmation) {
      setConfirmModalMode("generate");
      return;
    }
    await executeGenerate();
  }, [executeGenerate, requiresFreeGenerationConfirmation]);

  const confirmModalState = useMemo(
    () => deriveConfirmModalState(confirmModalMode, usageLabel),
    [confirmModalMode, usageLabel],
  );

  const confirmModalAction = useCallback(() => {
    if (confirmModalMode === "generate") {
      setConfirmModalMode(null);
      void executeGenerate();
      return;
    }
  }, [confirmModalMode, executeGenerate, setConfirmModalMode]);

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
    confirmModalMessage: confirmModalState.message,
    confirmModalAction,
    isFreeUsageHint: confirmModalState.isFreeUsageHint,
    showFreeGenerationModalTitle: confirmModalState.showFreeGenerationModalTitle,
    resetGenerationState,
  };
}

// === Helpers ===

function prepareGenerationContext({
  currentContextId,
  title,
  description,
  setGenerationContextId,
}: {
  currentContextId: string | null;
  title: string;
  description: string;
  setGenerationContextId: Dispatch<SetStateAction<string | null>>;
}) {
  const contextId = currentContextId || generateContextId();
  setGenerationContextId(contextId);

  savePendingContext({
    id: contextId,
    title,
    description,
  });
  savePendingGuestGeneration({
    kind: "guest_generation",
    id: contextId,
    title,
    description,
    createdAt: Date.now(),
  });

  return contextId;
}

async function getTurnstileToken({
  enabled,
  ref,
  showToast,
}: {
  enabled: boolean;
  ref: RefObject<TurnstileFieldHandle | null>;
  showToast: (toast: ToastInput) => string;
}): Promise<{ ok: true; token: string | null } | { ok: false }> {
  if (!enabled) {
    return { ok: true, token: null };
  }

  try {
    const token = (await ref.current?.getToken()) ?? null;
    if (!token) {
      showToast(toastMessages.botCheckFailed);
      return { ok: false };
    }
    return { ok: true, token };
  } catch (err) {
    showToast({
      ...toastMessages.botCheckFailed,
      body:
        err instanceof Error
          ? err.message
          : toastMessages.botCheckFailed.body,
    });
    return { ok: false };
  }
}

function clearResumeParams() {
  const url = new URL(window.location.href);
  if (
    url.searchParams.has("gen_ctx") ||
    url.searchParams.has("guest_generation") ||
    url.searchParams.has("checkout")
  ) {
    url.searchParams.delete("gen_ctx");
    url.searchParams.delete("guest_generation");
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.toString());
  }
}

function isFreeGenerationConfirmationRequired(
  usageLabel: string | null,
  paywall: PaywallState | null,
  isUnlockingFromPaywall: boolean,
) {
  const normalized = usageLabel?.toLowerCase() ?? "";
  return (
    normalized.includes("1 free generation") &&
    !paywall &&
    !isUnlockingFromPaywall
  );
}

function deriveConfirmModalState(
  confirmModalMode: "unlock" | "generate" | null,
  usageLabel: string | null,
) {
  const normalized = usageLabel?.toLowerCase() ?? "";
  const freeGenerationMessage =
    "You are about to use your one free generation. Would you like to use that now?";

  return {
    message:
      confirmModalMode === "generate" ||
      normalized.includes("1 free generation")
        ? freeGenerationMessage
        : "Would you like to use a generation to unlock the tags?",
    isFreeUsageHint: normalized.includes("free"),
    showFreeGenerationModalTitle: confirmModalMode === "generate",
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
  isHistoryAuthenticated: boolean;
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
