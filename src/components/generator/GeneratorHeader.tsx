"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HistoryMode } from "./HistoryPanel";

// === Components ===

export function GeneratorHeader({
  historyMode,
  usageLabel,
  usageHint,
  isUsageHintOpen,
  isFreeUsageHint,
  monthlyResetDateText,
  canSwitchHistoryMode,
  onOpenUsageHint,
  onQueueUsageHintClose,
  onGoToPricing,
  onShowGeneratorMode,
  onShowHistoryMode,
}: GeneratorHeaderProps) {
  return (
    <div className="mb-6 flex shrink-0 items-center gap-2">
      {historyMode === "history" ? (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
          <Clock className="h-3.5 w-3.5 text-white" />
        </div>
      ) : (
        <Image
          src="/logo.png"
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
        />
      )}
      <span className="text-sm font-semibold text-stone-700">
        {historyMode === "history" ? "Generation History" : "Tag Generator"}
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
                aria-describedby={isUsageHintOpen ? "usage-hint-tooltip" : undefined}
                onMouseEnter={onOpenUsageHint}
                onMouseLeave={onQueueUsageHintClose}
                onFocus={onOpenUsageHint}
                onBlur={onQueueUsageHintClose}
                className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-stone-500 transition-colors hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300/60"
              >
                <Info className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {isUsageHintOpen ? (
                  <motion.div
                    id="usage-hint-tooltip"
                    role="tooltip"
                    onMouseEnter={onOpenUsageHint}
                    onMouseLeave={onQueueUsageHintClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                    className="absolute right-0 top-full z-20 mt-1.5 w-64 rounded-lg border border-stone-200 bg-white/95 px-3 py-2 text-xs leading-relaxed text-stone-600 shadow-lg backdrop-blur-sm"
                  >
                    {isFreeUsageHint ? (
                      <p>
                        New accounts get 1 free generation. You can purchase more
                        generations in the{" "}
                        <button
                          type="button"
                          onClick={onGoToPricing}
                          className="font-medium text-orange-700 hover:text-orange-800 hover:underline"
                        >
                          plans section
                        </button>
                        .
                      </p>
                    ) : (
                      <p>{usageHint}</p>
                    )}
                    {usageLabel.toLowerCase().includes("/100") && monthlyResetDateText ? (
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
            historyMode === "history" ? onShowGeneratorMode() : onShowHistoryMode()
          }
          className={usageLabel ? undefined : "ml-auto"}
        />
      ) : null}
    </div>
  );
}

// === Types ===

type GeneratorHeaderProps = {
  historyMode: HistoryMode;
  usageLabel: string | null;
  usageHint: string | null;
  isUsageHintOpen: boolean;
  isFreeUsageHint: boolean;
  monthlyResetDateText: string | null;
  canSwitchHistoryMode: boolean;
  onOpenUsageHint: () => void;
  onQueueUsageHintClose: () => void;
  onGoToPricing: () => void;
  onShowGeneratorMode: () => void;
  onShowHistoryMode: () => void;
};

// === Helpers ===

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
