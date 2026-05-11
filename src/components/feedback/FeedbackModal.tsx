"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/form";

type FeedbackModalProps = {
  open: boolean;
  title: string;
  placeholder: string;
  initialNote?: string | null;
  maxLength?: number;
  isSubmitting?: boolean;
  onCloseWithoutNote: () => void;
  onSubmit: (note: string) => void;
};

export default function FeedbackModal({
  open,
  title,
  placeholder,
  initialNote = "",
  maxLength = 1000,
  isSubmitting = false,
  onCloseWithoutNote,
  onSubmit,
}: FeedbackModalProps) {
  const [note, setNote] = useState(initialNote ?? "");

  useEffect(() => {
    if (!open) return;
    setNote(initialNote ?? "");
  }, [initialNote, open]);

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
            aria-label="Close feedback modal"
            className="absolute inset-0 bg-stone-900/45"
            onClick={onCloseWithoutNote}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <h3 className="text-base font-semibold text-stone-900">{title}</h3>
            <div className="mt-4">
              <TextArea
                value={note}
                onChange={(event) => setNote(event.target.value.slice(0, maxLength))}
                rows={4}
                placeholder={placeholder}
                maxLength={maxLength}
              />
            </div>
            <div className="mt-4">
              <Button
                className="w-full"
                onClick={() => onSubmit(note.trim())}
                isLoading={isSubmitting}
              >
                Submit
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
