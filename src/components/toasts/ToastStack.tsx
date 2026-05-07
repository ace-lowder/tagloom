"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleX, Info, X } from "lucide-react";

import type { ToastItem, ToastType } from "@/components/toasts/toasts";
import { cn } from "@/lib/utils";

// === Components ===

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col-reverse gap-3 sm:inset-x-auto sm:right-5 sm:w-96">
      {toasts.map((toast) => (
        <ToastMessage key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastMessage({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const startedAtRef = useRef(Date.now());
  const remainingMsRef = useRef(TOAST_DISMISS_MS);

  useEffect(() => {
    if (isPaused) return;

    startedAtRef.current = Date.now();
    const timeout = window.setTimeout(() => {
      onDismiss(toast.id);
    }, remainingMsRef.current);

    return () => {
      window.clearTimeout(timeout);
      const elapsed = Date.now() - startedAtRef.current;
      remainingMsRef.current = Math.max(remainingMsRef.current - elapsed, 0);
    };
  }, [toast.id, isPaused, onDismiss]);

  const Icon = toastIcons[toast.type];

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex gap-3 rounded-xl border bg-white p-4 shadow-xl shadow-stone-900/10",
        toastToneClasses[toast.type],
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <Icon className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-stone-950">{toast.title}</p>
        {toast.body ? (
          <p className="mt-1 text-sm leading-relaxed text-stone-600">{toast.body}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
        aria-label={`Dismiss ${toast.title}`}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// === Constants ===

const TOAST_DISMISS_MS = 9000;

const toastIcons = {
  success: CheckCircle2,
  danger: CircleX,
  info: Info,
} satisfies Record<ToastType, typeof CheckCircle2>;

const toastToneClasses = {
  success: "border-green-200 text-success",
  danger: "border-red-200 text-danger",
  info: "border-blue-200 text-info",
};
