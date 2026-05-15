"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import type { ToastInput } from "@/components/toasts/toasts";
import { toastMessages } from "@/components/toasts/toastMessages";
import { AUTH_SUCCESS_EVENT } from "@/lib/authModal";
import {
  generateContextId,
  loadPendingContext,
  savePendingContext,
} from "./generatorStorage";
import { DEFAULT_TITLE_PLACEHOLDER } from "./generatorConstants";
import type {
  DescriptionRevealMode,
  PaywallState,
  PendingContext,
} from "./generatorTypes";

// === Hooks ===

export function useGenerationAccess({
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
}: UseGenerationAccessParams) {
  const [generationContextId, setGenerationContextId] = useState<string | null>(
    null,
  );
  const [unlockReadyContext, setUnlockReadyContext] =
    useState<PendingContext | null>(null);

  const goToLogin = useCallback(() => {
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
  }, [
    description,
    generationContextId,
    markUserInteraction,
    openAuthModal,
    showToast,
    title,
  ]);

  const goToPricing = useCallback(() => {
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
  }, [markUserInteraction, playSheen]);

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
      runGeneration(context.title, context.description, context.id).catch((err) => {
        showToast({
          ...toastMessages.generationResumeFailed,
          body:
            err instanceof Error
              ? err.message
              : toastMessages.generationResumeFailed.body,
        });
      });
    }, 120);
  }, [
    clearDemoTimer,
    clearRevealTimer,
    runGeneration,
    setDescription,
    setDescriptionRevealMode,
    setIsDemoActive,
    setShowDescription,
    setTitle,
    setTitlePlaceholder,
    shouldSkipDemoRef,
    showToast,
  ]);

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
      if (!getVisibleTagsLength()) return;

      const context = loadPendingContext(generationContextId);
      if (!context) return;

      setUnlockReadyContext(null);
      setConfirmModalMode(null);

      refreshUsageLabel().then(({ usageLabel: nextUsageLabel, resolved }) => {
        const shouldAutoUnlock = resolved && !nextUsageLabel;
        if (shouldAutoUnlock) {
          setPaywall(null);
          setIsUnlockingFromPaywall(true);
          resetResultTags();
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
    getVisibleTagsLength,
    paywall,
    refreshUsageLabel,
    resetResultTags,
    runGeneration,
    setConfirmModalMode,
    setIsUnlockingFromPaywall,
    setPaywall,
    showToast,
  ]);

  const beginUnlockFromContext = useCallback(
    (context: PendingContext) => {
      setPaywall(null);
      setIsUnlockingFromPaywall(true);
      setUnlockReadyContext(null);
      setConfirmModalMode(null);
      resetResultTags();
      runGeneration(context.title, context.description, context.id).catch((err) => {
        setIsUnlockingFromPaywall(false);
        showToast({
          ...toastMessages.generationResumeFailed,
          body:
            err instanceof Error
              ? err.message
              : toastMessages.generationResumeFailed.body,
        });
      });
    },
    [
      resetResultTags,
      runGeneration,
      setConfirmModalMode,
      setIsUnlockingFromPaywall,
      setPaywall,
      showToast,
    ],
  );

  const onUnlockTags = useCallback(() => {
    if (!unlockReadyContext) return;
    setConfirmModalMode("unlock");
  }, [setConfirmModalMode, unlockReadyContext]);

  return {
    generationContextId,
    setGenerationContextId,
    unlockReadyContext,
    setUnlockReadyContext,
    goToLogin,
    goToPricing,
    onUnlockTags,
    beginUnlockFromContext,
  };
}

type UseGenerationAccessParams = {
  title: string;
  description: string;
  paywall: PaywallState | null;
  getVisibleTagsLength: () => number;
  openAuthModal: (options: {
    mode?: "login" | "signup";
    source?: string;
    next?: string;
  }) => void;
  showToast: (toast: ToastInput) => string;
  markUserInteraction: () => void;
  playSheen: () => void;
  clearDemoTimer: () => void;
  clearRevealTimer: () => void;
  resetResultTags: () => void;
  setTitle: Dispatch<SetStateAction<string>>;
  setDescription: Dispatch<SetStateAction<string>>;
  setShowDescription: Dispatch<SetStateAction<boolean>>;
  setDescriptionRevealMode: Dispatch<SetStateAction<DescriptionRevealMode>>;
  setTitlePlaceholder: Dispatch<SetStateAction<string>>;
  setIsDemoActive: Dispatch<SetStateAction<boolean>>;
  shouldSkipDemoRef: MutableRefObject<boolean>;
  refreshUsageLabel: () => Promise<{ usageLabel: string | null; resolved: boolean }>;
  loadHistory: () => Promise<void>;
  runGeneration: (
    title: string,
    description: string,
    contextId: string,
    turnstileToken?: string | null,
  ) => Promise<void>;
  setPaywall: Dispatch<SetStateAction<PaywallState | null>>;
  setIsUnlockingFromPaywall: Dispatch<SetStateAction<boolean>>;
  setConfirmModalMode: Dispatch<SetStateAction<"unlock" | "generate" | null>>;
};
