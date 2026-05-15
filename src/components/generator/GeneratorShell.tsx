"use client";

import { motion } from "framer-motion";
import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import GradientBackground from "./GradientBackground";
import type { ClearPhase } from "./generatorTypes";

type GeneratorShellProps = {
  glowRef?: RefObject<HTMLDivElement>;
  shellRef: RefObject<HTMLDivElement>;
  contentRef: RefObject<HTMLDivElement>;
  historyMode: "generator" | "history";
  clearPhase: ClearPhase;
  shellHeightPx: number | null;
  shellHeightTransitionMs: number;
  historyShellHeightPx: number | null;
  activeSheenId: number | null;
  onSheenAnimationComplete: () => void;
  children: ReactNode;
};

export function GeneratorShell({
  glowRef,
  shellRef,
  contentRef,
  historyMode,
  clearPhase,
  shellHeightPx,
  shellHeightTransitionMs,
  historyShellHeightPx,
  activeSheenId,
  onSheenAnimationComplete,
  children,
}: GeneratorShellProps) {
  return (
    <div ref={glowRef} id="generator" className="relative mx-auto max-w-2xl">
      <div className="pointer-events-none absolute -inset-8 overflow-hidden rounded-3xl">
        <GradientBackground />
      </div>

      <motion.div
        ref={shellRef}
        data-testid="generator-shell"
        data-clear-phase={clearPhase}
        data-height-locked={shellHeightPx !== null ? "true" : "false"}
        data-history-height-locked={
          historyMode === "history" && historyShellHeightPx !== null
            ? "true"
            : "false"
        }
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className={cn(
          "relative rounded-2xl",
          historyMode === "history" ? "overflow-hidden" : "overflow-visible",
        )}
        style={{
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: "1px solid rgba(255,255,255,0.92)",
          boxShadow:
            "0 24px 84px rgba(249,115,22,0.24), 0 12px 52px rgba(168,85,247,0.18), 0 1px 0 rgba(255,255,255,0.92) inset",
          height:
            historyMode === "history"
              ? (historyShellHeightPx ?? shellHeightPx ?? undefined)
              : (shellHeightPx ?? undefined),
          transition:
            shellHeightPx !== null
              ? `height ${shellHeightTransitionMs}ms ease-out`
              : undefined,
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          {activeSheenId ? (
            <motion.div
              key={activeSheenId}
              initial={{ x: "-120%", opacity: 0 }}
              animate={{ x: "170%", opacity: [0, 0.9, 0] }}
              transition={{ duration: 0.95, ease: "easeInOut" }}
              onAnimationComplete={onSheenAnimationComplete}
              className="absolute inset-y-0 left-0 z-20 w-2/5 -skew-x-12"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.78) 45%, rgba(255,255,255,0) 100%)",
              }}
            />
          ) : null}
        </div>

        <div
          ref={contentRef}
          className="relative z-10 flex h-full min-h-0 flex-col p-6 sm:p-8"
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
