"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ToastStack } from "@/components/toasts/ToastStack";
import { ToastContext, type ToastInput, type ToastItem } from "@/components/toasts/toasts";

// === Components ===

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((input: ToastInput) => {
    const id = createToastId();
    setToasts((current) => [
      ...current,
      {
        id,
        title: input.title,
        body: input.body,
        type: input.type ?? "info",
      },
    ]);
    return id;
  }, []);

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

// === Helpers ===

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
