"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { HistoryConfirmAction } from "./generatorTypes";

// === Components ===

export function GenerationConfirmDialog({
  open,
  showFreeGenerationTitle,
  message,
  onConfirm,
  onCancel,
}: GenerationConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            type="button"
            aria-label="Close unlock confirmation"
            className="absolute inset-0 bg-stone-900/45"
            onClick={onCancel}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-xs rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {showFreeGenerationTitle ? (
              <h3 className="mb-2 text-left text-base font-semibold">
                <span className="text-stone-900">You have </span>
                <span className="text-orange-700">1 Free Generation</span>
              </h3>
            ) : null}
            <p className="text-left text-sm font-medium leading-relaxed text-stone-700">{message}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onConfirm}
                className="w-full rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-3.5 py-2 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
              >
                No
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function HistoryConfirmDialog({
  action,
  onConfirm,
  onCancel,
}: HistoryConfirmDialogProps) {
  return (
    <AnimatePresence>
      {action ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <button
            type="button"
            aria-label="Cancel history action"
            className="absolute inset-0 bg-stone-900/45"
            onClick={onCancel}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <h3 className="text-base font-semibold text-stone-900">
              {action.type === "delete-draft"
                ? "Delete draft?"
                : action.type === "restore-generation"
                  ? "Restore generation?"
                  : "Archive generation?"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              {action.type === "delete-draft"
                ? "This removes the draft from this browser."
                : action.type === "restore-generation"
                  ? "This moves the generation back into normal history."
                  : "This hides the generation from normal history without deleting it from your account."}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onConfirm}
                className="w-full rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-3.5 py-2 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
              >
                {action.type === "delete-draft"
                  ? "Delete draft"
                  : action.type === "restore-generation"
                    ? "Restore generation"
                    : "Archive generation"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// === Types ===

type GenerationConfirmDialogProps = {
  open: boolean;
  showFreeGenerationTitle: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

type HistoryConfirmDialogProps = {
  action: HistoryConfirmAction | null;
  onConfirm: () => void;
  onCancel: () => void;
};
