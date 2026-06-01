"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import FeedbackModal from "@/components/feedback/FeedbackModal";
import { toastMessages } from "@/components/toasts/toastMessages";
import { useToast } from "@/components/toasts/toasts";
import { useAuthController } from "@/components/auth/AuthController";
import TurnstileField, {
  type TurnstileFieldHandle,
} from "@/components/security/TurnstileField";
import { cn } from "@/lib/utils";
import { HistoryPanel, type GenerationHistoryItem } from "./HistoryPanel";
import { DEFAULT_TITLE_PLACEHOLDER } from "./generatorConstants";
import type { DescriptionRevealMode, GeneratorProps } from "./generatorTypes";
import { GeneratorHeader } from "./GeneratorHeader";
import { GeneratorForm } from "./GeneratorForm";
import { GeneratorResults } from "./GeneratorResults";
import { GenerationConfirmDialog, HistoryConfirmDialog } from "./GeneratorDialogs";
import { GeneratorShell } from "./GeneratorShell";
import { usePausableTimer } from "./usePausableTimer";
import { useGeneratorUsage } from "./useGeneratorUsage";
import { useGeneratorFeedback } from "./useGeneratorFeedback";
import { useGeneratorHistory } from "./useGeneratorHistory";
import { useGeneratedTags } from "./useGeneratedTags";
import { useGeneratorGeneration } from "./useGeneratorGeneration";
import { useGeneratorDemo } from "./useGeneratorDemo";

export default function Generator({ onFocus, glowRef, demoConfig }: GeneratorProps) {
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
  const [focusedField, setFocusedField] = useState<"title" | "description" | null>(
    null,
  );
  const [historyShellHeightPx, setHistoryShellHeightPx] = useState<number | null>(null);
  const [skipGeneratorReturnAnimations, setSkipGeneratorReturnAnimations] =
    useState(false);
  const [historyUnavailableVersion, setHistoryUnavailableVersion] = useState(0);
  const [draftDeletedVersion, setDraftDeletedVersion] = useState(0);

  // === Timers ===
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const clearVisibleResultsRef = useRef<() => void>(() => {});
  const resetGenerationStateRef = useRef<() => void>(() => {});
  const setCurrentGenerationIdRef = useRef<(id: string | null) => void>(() => {});

  const {
    setTimer: setRevealTimer,
    pauseTimer: pauseRevealTimer,
    resumeTimer: resumeRevealTimer,
    clearTimer: clearRevealTimer,
  } = usePausableTimer();

  const stableResetGenerationState = useCallback(() => {
    resetGenerationStateRef.current();
  }, []);

  const stableClearVisibleResults = useCallback(() => {
    clearVisibleResultsRef.current();
  }, []);

  const visibleTagsLengthRef = useRef(0);
  const clearCurrentGenerationFeedbackRef = useRef<() => void>(() => {});
  const generatedActionsRef = useRef<{
    setResultTags: (target: string[], discovery: string[]) => void;
    resetResultTags: () => void;
  }>({
    setResultTags: () => {},
    resetResultTags: () => {},
  });

  const stableSetResultTags = useCallback((target: string[], discovery: string[]) => {
    generatedActionsRef.current.setResultTags(target, discovery);
  }, []);

  const stableResetResultTags = useCallback(() => {
    generatedActionsRef.current.resetResultTags();
  }, []);

  const clearCurrentGenerationFeedback = useCallback(() => {
    clearCurrentGenerationFeedbackRef.current();
  }, []);

  const revealDescriptionWithoutAnimation = useCallback(() => {
    if (showDescription) return;
    setDescriptionRevealMode("none");
    setShowDescription(true);
  }, [showDescription]);

  // === Usage ===
  const {
    usageLabel,
    usageHint,
    monthlyResetDateText,
    isUsageHintOpen,
    refreshUsageLabel,
    openUsageHint,
    queueUsageHintClose,
  } = useGeneratorUsage();

  const handleHistoryUnavailable = useCallback(() => {
    setCurrentGenerationIdRef.current(null);
    setHistoryUnavailableVersion((current) => current + 1);
  }, []);

  const handleCachedDraftSelected = useCallback(
    (draft: { title: string; description: string }) => {
      setTitle(draft.title);
      setDescription(draft.description);
      setDescriptionRevealMode("idle");
      setShowDescription(false);
      setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
    },
    [],
  );

  const handleSelectedDraftDeleted = useCallback(() => {
    setTitle("");
    setDescription("");
    setDescriptionRevealMode("none");
    setShowDescription(false);
    setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
    setCurrentGenerationIdRef.current(null);
    setDraftDeletedVersion((current) => current + 1);
  }, []);

  // === Demo ===
  const {
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
    revealStepMs,
    markUserInteraction,
    playSheen,
    beginDemoInteraction,
    clearDemoTimer,
    revealDescriptionFromFocus,
    onSheenAnimationComplete,
  } = useGeneratorDemo({
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
    resetGenerationState: stableResetGenerationState,
    clearVisibleResults: stableClearVisibleResults,
    setResultTags: stableSetResultTags,
    setTitle,
    setDescription,
    setTitlePlaceholder,
    setShowDescription,
    setDescriptionRevealMode,
    setFocusedField,
  });

  // === History ===
  const {
    displayHistoryItems,
    historyMode,
    setHistoryMode,
    historySortState,
    showArchivedHistory,
    isHistoryAuthenticated,
    selectedHistoryId,
    setSelectedHistoryId,
    selectedDraftId,
    setSelectedDraftId,
    historyConfirmAction,
    setHistoryConfirmAction,
    loadHistory,
    syncDraftFromUserInput,
    removeSelectedDraftAfterGeneration,
    confirmHistoryAction,
    cycleHistorySort,
    setFeedbackForGenerationInHistory,
  } = useGeneratorHistory({
    isDemoActive,
    showToast,
    onHistoryUnavailable: handleHistoryUnavailable,
    onCachedDraftSelected: handleCachedDraftSelected,
    onSelectedDraftDeleted: handleSelectedDraftDeleted,
  });

  // === Generation ===
  const {
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
  } = useGeneratorGeneration({
    form: {
      title,
      description,
      setTitle,
      setDescription,
      setShowDescription,
      setDescriptionRevealMode,
      setTitlePlaceholder,
    },
    result: {
      getVisibleTagsLength: () => visibleTagsLengthRef.current,
      clearRevealTimer,
      resetResultTags: stableResetResultTags,
      setResultTags: stableSetResultTags,
    },
    demo: {
      markUserInteraction,
      playSheen,
      clearDemoTimer,
      setIsDemoActive,
      shouldSkipDemoRef,
    },
    layout: {
      setClearPhase,
      setShellHeightPx,
      setShellHeightTransitionMs,
    },
    usage: {
      usageLabel,
      refreshUsageLabel,
    },
    history: {
      loadHistory,
      removeSelectedDraftAfterGeneration,
      setSelectedHistoryId,
    },
    feedback: {
      clearCurrentGenerationFeedback,
    },
    auth: {
      openAuthModal,
      showToast,
    },
    turnstile: {
      enabled: turnstileEnabled,
      ref: turnstileRef,
    },
  });
  setCurrentGenerationIdRef.current = setCurrentGenerationId;
  resetGenerationStateRef.current = resetGenerationState;

  // === Generated Tags ===
  const {
    visibleTags,
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
  } = useGeneratedTags({
    paywall,
    isUnlockingFromPaywall,
    skipGeneratorReturnAnimations,
    revealStepMs,
    markUserInteraction,
    setRevealTimer,
    clearRevealTimer,
  });

  generatedActionsRef.current = { setResultTags, resetResultTags };
  clearVisibleResultsRef.current = clearVisibleResults;

  // === Feedback ===
  const {
    currentGenerationFeedback,
    setCurrentGenerationFeedback,
    isGenerationFeedbackSaving,
    isGenerationDownvoteModalOpen,
    setIsGenerationDownvoteModalOpen,
    onGenerationFeedbackUp,
    onGenerationFeedbackDown,
    submitGenerationDownvote,
  } = useGeneratorFeedback({
    currentGenerationId,
    onHistoryFeedbackChange: setFeedbackForGenerationInHistory,
    showToast,
  });

  clearCurrentGenerationFeedbackRef.current = () => {
    setCurrentGenerationFeedback(null);
  };

  visibleTagsLengthRef.current = visibleTags.length;

  useEffect(() => {
    void refreshUsageLabel();
  }, [refreshUsageLabel]);

  useEffect(() => {
    setCurrentGenerationFeedback(null);
  }, [draftDeletedVersion, historyUnavailableVersion, setCurrentGenerationFeedback]);

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
        resetGenerationState();
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
      resetGenerationState();
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
      resetGenerationState,
      setClearPhase,
      setCurrentGenerationFeedback,
      setCurrentGenerationId,
      setResultTagsImmediately,
      setSelectedDraftId,
      setSelectedHistoryId,
      setShellHeightPx,
      setShellHeightTransitionMs,
      showToast,
    ],
  );

  const showHistoryMode = useCallback(() => {
    const shellHeight = shellRef.current?.getBoundingClientRect().height;
    if (typeof shellHeight === "number" && Number.isFinite(shellHeight)) {
      setHistoryShellHeightPx(Math.round(shellHeight));
    }
    setHistoryMode("history");
  }, [setHistoryMode]);

  const showGeneratorMode = useCallback(() => {
    setSkipGeneratorReturnAnimations(true);
    setHistoryMode("generator");
    setHistoryShellHeightPx(null);
  }, [setHistoryMode]);

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

  // === Derived State ===
  const isClearingFade = clearPhase === "fading";
  const hasTitle = Boolean(title.trim());
  const showGenerationFeedbackControls =
    !isDemoActive &&
    isHistoryAuthenticated &&
    Boolean(currentGenerationId) &&
    totalTags > 0 &&
    !paywall &&
    !isUnlockingFromPaywall;
  const canSwitchHistoryMode = !isDemoActive && isHistoryAuthenticated;

  // === Handlers ===
  const handleTitleFocus = useCallback(() => {
    if (isDemoActive) {
      beginDemoInteraction();
      return;
    }
    markUserInteraction();
    revealDescriptionFromFocus();
    setFocusedField("title");
    if (onFocus) onFocus();
  }, [
    beginDemoInteraction,
    isDemoActive,
    markUserInteraction,
    onFocus,
    revealDescriptionFromFocus,
  ]);

  const handleTitleBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const handleTitleChange = useCallback(
    (nextTitle: string) => {
      markUserInteraction();
      setTitle(nextTitle);
      syncDraftFromUserInput(nextTitle, description);
      if (nextTitle.length > 0) {
        setTitlePlaceholder(DEFAULT_TITLE_PLACEHOLDER);
      }
    },
    [description, markUserInteraction, syncDraftFromUserInput],
  );

  const handleDescriptionFocus = useCallback(() => {
    setFocusedField("description");
  }, []);

  const handleDescriptionBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const handleDescriptionChange = useCallback(
    (nextDescription: string) => {
      markUserInteraction();
      setDescription(nextDescription);
      syncDraftFromUserInput(title, nextDescription);
    },
    [markUserInteraction, syncDraftFromUserInput, title],
  );

  const handleGenerateButtonClick = useCallback(() => {
    if (isDemoActive) {
      beginDemoInteraction();
      return;
    }
    void handleGenerate();
  }, [beginDemoInteraction, handleGenerate, isDemoActive]);

  const handleDescriptionAnimationComplete = useCallback(() => {
    if (descriptionRevealMode === "first-focus") {
      setDescriptionRevealMode("none");
    }
  }, [descriptionRevealMode]);

  const handleStartAuthUnlock = useCallback(() => {
    goToLogin();
  }, [goToLogin]);

  const handleUnlockGeneratedTags = useCallback(() => {
    onUnlockTags();
  }, [onUnlockTags]);

  return (
    <>
      <GeneratorShell
        glowRef={glowRef}
        shellRef={shellRef}
        contentRef={contentRef}
        historyMode={historyMode}
        clearPhase={clearPhase}
        shellHeightPx={shellHeightPx}
        shellHeightTransitionMs={shellHeightTransitionMs}
        historyShellHeightPx={historyShellHeightPx}
        activeSheenId={activeSheenId}
        onSheenAnimationComplete={onSheenAnimationComplete}
      >
        <GeneratorHeader
          historyMode={historyMode}
          usageLabel={usageLabel}
          usageHint={usageHint}
          isUsageHintOpen={isUsageHintOpen}
          isFreeUsageHint={isFreeUsageHint}
          monthlyResetDateText={monthlyResetDateText}
          canSwitchHistoryMode={canSwitchHistoryMode}
          onOpenUsageHint={openUsageHint}
          onQueueUsageHintClose={queueUsageHintClose}
          onGoToPricing={goToPricing}
          onShowGeneratorMode={showGeneratorMode}
          onShowHistoryMode={showHistoryMode}
        />

        <div
          className={cn(
            "min-h-0 flex-1",
            historyMode === "history" ? "overflow-hidden" : "overflow-visible",
          )}
        >
          {historyMode === "generator" ? (
            <div data-testid="generator-scroll-panel" className="overflow-visible">
              <GeneratorForm
                title={title}
                titlePlaceholder={titlePlaceholder}
                description={description}
                showDescription={showDescription}
                descriptionRevealMode={descriptionRevealMode}
                skipGeneratorReturnAnimations={skipGeneratorReturnAnimations}
                focusedField={focusedField}
                hasTitle={hasTitle}
                isGenerating={isGenerating || isDemoGenerating}
                titleInputRef={titleInputRef}
                onTitleFocus={handleTitleFocus}
                onTitleBlur={handleTitleBlur}
                onTitleChange={handleTitleChange}
                onDescriptionFocus={handleDescriptionFocus}
                onDescriptionBlur={handleDescriptionBlur}
                onDescriptionChange={handleDescriptionChange}
                onDescriptionAnimationComplete={handleDescriptionAnimationComplete}
                onGenerate={handleGenerateButtonClick}
              />

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
                      skipGeneratorReturnAnimations ? false : { opacity: 0, y: 8 }
                    }
                    animate={
                      isClearingFade ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }
                    }
                    transition={{
                      duration: isClearingFade ? 0.16 : 0.22,
                      ease: "easeOut",
                    }}
                    className="mt-6"
                  >
                    <GeneratorResults
                      showResults={showResults}
                      visibleTags={visibleTags}
                      shouldRevealTagChips={shouldRevealTagChips}
                      paywall={paywall}
                      unlockReadyContext={unlockReadyContext}
                      isUnlockingFromPaywall={isUnlockingFromPaywall}
                      canCopyAll={canCopyAll}
                      copied={copied}
                      showGenerationFeedbackControls={showGenerationFeedbackControls}
                      currentGenerationFeedback={currentGenerationFeedback}
                      isGenerationFeedbackSaving={isGenerationFeedbackSaving}
                      onCopyAll={handleCopyAll}
                      onFeedbackUp={() => {
                        void onGenerationFeedbackUp();
                      }}
                      onFeedbackDown={() => {
                        void onGenerationFeedbackDown();
                      }}
                      onStartAuthUnlock={handleStartAuthUnlock}
                      onUnlockGeneratedTags={handleUnlockGeneratedTags}
                      onGoToPricing={goToPricing}
                    />
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
      </GeneratorShell>

      <GenerationConfirmDialog
        open={Boolean(confirmModalMode)}
        showFreeGenerationTitle={showFreeGenerationModalTitle}
        message={confirmModalMessage}
        onConfirm={confirmModalAction}
        onCancel={() => setConfirmModalMode(null)}
      />

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

      <HistoryConfirmDialog
        action={historyConfirmAction}
        onConfirm={() => void confirmHistoryAction()}
        onCancel={() => setHistoryConfirmAction(null)}
      />
    </>
  );
}
