"use client";

import { motion } from "framer-motion";
import { Check, Copy, LockOpen } from "lucide-react";
import FeedbackButtons from "@/components/feedback/FeedbackButtons";
import { GENERATED_TAG_CHIP_CLASSNAME } from "./generatorConstants";
import type { GenerationFeedback, PaywallState, PendingContext } from "./generatorTypes";

// === Components ===

export function GeneratorResults({
  showResults,
  visibleTags,
  shouldRevealTagChips,
  paywall,
  unlockReadyContext,
  isUnlockingFromPaywall,
  canCopyAll,
  copied,
  showGenerationFeedbackControls,
  currentGenerationFeedback,
  isGenerationFeedbackSaving,
  onCopyAll,
  onFeedbackUp,
  onFeedbackDown,
  onStartAuthUnlock,
  onUnlockGeneratedTags,
  onGoToPricing,
}: GeneratorResultsProps) {
  if (!showResults) return null;

  const showUnlockReadyState =
    Boolean(unlockReadyContext) && (!paywall || paywall.reason === "auth_required");
  const showTopBar = !isUnlockingFromPaywall && !(showUnlockReadyState && visibleTags.length === 0);

  return (
    <>
      {showTopBar ? (
        <div className="mb-3 flex items-center justify-between">
          <span data-testid="generated-tag-count" className="text-sm font-medium text-stone-700">
            {visibleTags.length} tags generated
          </span>
          <button
            onClick={onCopyAll}
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
      ) : (
        <>
          {showUnlockReadyState ? (
            <div className="mt-3 flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white/70 py-8">
              <div className="relative h-12 w-12">
                <div className="absolute inset-0 flex items-center justify-center rounded-full border border-orange-300 bg-white text-orange-600">
                  <LockOpen className="h-5 w-5" />
                </div>
              </div>
              <p className="max-w-sm text-center text-sm font-semibold text-stone-700">
                Your listing is ready. Review it, then use your free generation.
              </p>
              <button
                type="button"
                onClick={onUnlockGeneratedTags}
                className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700"
              >
                Use my free generation
              </button>
            </div>
          ) : null}

          <div className={`flex flex-wrap items-center gap-2 ${paywall ? "blur-sm select-none" : ""}`}>
            {visibleTags.map((tag, i) =>
              shouldRevealTagChips ? (
                <motion.span
                  key={`${tag}-${i}`}
                  data-testid="generated-tag-chip"
                  data-animation="reveal"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 20 }}
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
                  onUp={onFeedbackUp}
                  onDown={onFeedbackDown}
                />
              </div>
            ) : null}
          </div>
        </>
      )}

      {paywall && !showUnlockReadyState ? (
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
                    onClick={onStartAuthUnlock}
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
                onClick={onGoToPricing}
                className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700"
              >
                Get more generations
              </button>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}

// === Types ===

type GeneratorResultsProps = {
  showResults: boolean;
  visibleTags: string[];
  shouldRevealTagChips: boolean;
  paywall: PaywallState | null;
  unlockReadyContext: PendingContext | null;
  isUnlockingFromPaywall: boolean;
  canCopyAll: boolean;
  copied: boolean;
  showGenerationFeedbackControls: boolean;
  currentGenerationFeedback: GenerationFeedback | null;
  isGenerationFeedbackSaving: boolean;
  onCopyAll: () => void;
  onFeedbackUp: () => void;
  onFeedbackDown: () => void;
  onStartAuthUnlock: () => void;
  onUnlockGeneratedTags: () => void;
  onGoToPricing: () => void;
};
