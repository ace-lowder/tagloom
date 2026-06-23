"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  loadPendingGuestGeneration,
  loadPendingContext,
  savePendingContext,
  savePendingGuestGeneration,
} from "./generatorStorage";
import { DEFAULT_TITLE_PLACEHOLDER } from "./generatorConstants";
import type {
  DescriptionRevealMode,
  PendingContext,
  PendingGuestGeneration,
} from "./generatorTypes";

// === Hooks ===

export function useGenerationAccess({
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
  isHistoryAuthenticated,
  setConfirmModalMode,
}: UseGenerationAccessParams) {
  const [generationContextId, setGenerationContextId] = useState<string | null>(
    null,
  );
  const [unlockReadyContext, setUnlockReadyContext] =
    useState<PendingContext | null>(null);
  const restoredGuestGenerationIdRef = useRef<string | null>(null);

  const restoreGuestGenerationContext = useCallback(
    (context: PendingContext | PendingGuestGeneration) => {
      restoredGuestGenerationIdRef.current = context.id;
      shouldSkipDemoRef.current = true;
      setIsDemoActive(false);
      clearDemoTimer();
      clearRevealTimer();
      setGenerationContextId(context.id);
      setTitle(context.title);
      setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
      setDescription(context.description);
      setDescriptionRevealMode("none");
      setShowDescription(Boolean(context.description));
      setUnlockReadyContext({
        id: context.id,
        title: context.title,
        description: context.description,
      });
      savePendingGuestGeneration({
        kind: "guest_generation",
        id: context.id,
        title: context.title,
        description: context.description,
        createdAt:
          "createdAt" in context && typeof context.createdAt === "number"
            ? context.createdAt
            : Date.now(),
      });
    },
    [
      clearDemoTimer,
      clearRevealTimer,
      setDescription,
      setDescriptionRevealMode,
      setIsDemoActive,
      setShowDescription,
      setTitle,
      setTitlePlaceholder,
      shouldSkipDemoRef,
    ],
  );

  const loadVerifiedGuestGenerationContext = useCallback(() => {
    if (typeof window === "undefined") return null;

    const url = new URL(window.location.href);
    const guestGenerationId = url.searchParams.get("guest_generation");
    const guestGeneration = loadPendingGuestGeneration();
    if (!guestGeneration) return null;
    if (guestGenerationId && guestGeneration.id !== guestGenerationId) {
      return null;
    }

    return guestGeneration;
  }, []);

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
    savePendingGuestGeneration({
      kind: "guest_generation",
      id: contextId,
      title,
      description,
      createdAt: Date.now(),
    });

    openAuthModal({
      mode: "signup",
      source: "generator_paywall",
      next: `/?guest_generation=${encodeURIComponent(contextId)}`,
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
    const contextId = url.searchParams.get("guest_generation");

    if (!contextId) return;
    shouldSkipDemoRef.current = true;
    setIsDemoActive(false);
    clearDemoTimer();
    clearRevealTimer();

    const context = resolvePendingGuestContext(contextId);
    if (!context) return;

    setGenerationContextId(context.id);
    setTitle(context.title);
    setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
    setDescription(context.description);
    setDescriptionRevealMode("none");
    setShowDescription(Boolean(context.description));
    setUnlockReadyContext({
      id: context.id,
      title: context.title,
      description: context.description,
    });
  }, [
    clearDemoTimer,
    clearRevealTimer,
    setDescription,
    setDescriptionRevealMode,
    setIsDemoActive,
    setShowDescription,
    setTitle,
    setTitlePlaceholder,
    setUnlockReadyContext,
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
    if (!isHistoryAuthenticated) return;

    const guestGeneration = loadVerifiedGuestGenerationContext();
    if (!guestGeneration) return;
    if (restoredGuestGenerationIdRef.current === guestGeneration.id) return;

    restoreGuestGenerationContext({
      id: guestGeneration.id,
      title: guestGeneration.title,
      description: guestGeneration.description,
      createdAt: guestGeneration.createdAt,
    });
  }, [
    isHistoryAuthenticated,
    loadVerifiedGuestGenerationContext,
    restoreGuestGenerationContext,
  ]);

  useEffect(() => {
    const onAuthSuccess = () => {
      const context = resolvePendingGuestContext(generationContextId);
      if (!context) return;

      restoreGuestGenerationContext({
        id: context.id,
        title: context.title,
        description: context.description,
        createdAt: Date.now(),
      });
      setConfirmModalMode(null);
      setUnlockReadyContext(context);
    };

    window.addEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
    return () => window.removeEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
  }, [
    generationContextId,
    setConfirmModalMode,
    restoreGuestGenerationContext,
    setUnlockReadyContext,
  ]);

  const onUnlockTags = useCallback(() => {
    if (!unlockReadyContext) return;
    setConfirmModalMode("generate");
  }, [setConfirmModalMode, unlockReadyContext]);

  return {
    generationContextId,
    setGenerationContextId,
    unlockReadyContext,
    setUnlockReadyContext,
    goToLogin,
    goToPricing,
    onUnlockTags,
  };
}

function resolvePendingGuestContext(
  generationContextId: string | null,
): PendingContext | null {
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    const guestGenerationId = url.searchParams.get("guest_generation");
    if (guestGenerationId) {
      const guestGeneration = loadPendingGuestGeneration();
      if (guestGeneration && guestGeneration.id === guestGenerationId) {
        return {
          id: guestGeneration.id,
          title: guestGeneration.title,
          description: guestGeneration.description,
        };
      }
    }
  }

  if (generationContextId) {
    const sessionContext = loadPendingContext(generationContextId);
    if (sessionContext) return sessionContext;
  }

  const guestGeneration = loadPendingGuestGeneration();
  if (!guestGeneration) return null;

  return {
    id: guestGeneration.id,
    title: guestGeneration.title,
    description: guestGeneration.description,
  };
}

type UseGenerationAccessParams = {
  title: string;
  description: string;
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
  setTitle: Dispatch<SetStateAction<string>>;
  setDescription: Dispatch<SetStateAction<string>>;
  setShowDescription: Dispatch<SetStateAction<boolean>>;
  setDescriptionRevealMode: Dispatch<SetStateAction<DescriptionRevealMode>>;
  setTitlePlaceholder: Dispatch<SetStateAction<string>>;
  setIsDemoActive: Dispatch<SetStateAction<boolean>>;
  shouldSkipDemoRef: MutableRefObject<boolean>;
  refreshUsageLabel: () => Promise<{ usageLabel: string | null; resolved: boolean }>;
  loadHistory: () => Promise<void>;
  isHistoryAuthenticated: boolean;
  setConfirmModalMode: Dispatch<SetStateAction<"unlock" | "generate" | null>>;
};
