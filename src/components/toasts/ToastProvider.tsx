"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ToastStack } from "@/components/toasts/ToastStack";
import {
  ToastContext,
  type ToastInput,
  type ToastItem,
  type ToastType,
} from "@/components/toasts/toasts";

// === Components ===

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastsRef = useRef<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ToastTimer>>(new Map());

  const updateToasts = useCallback((updater: (current: ToastItem[]) => ToastItem[]) => {
    setToasts((current) => {
      const next = updater(current);
      toastsRef.current = next;
      return next;
    });
  }, []);

  const clearTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (!timer) return;
    window.clearTimeout(timer.timeoutId);
    timersRef.current.delete(id);
  }, []);

  const removeToast = useCallback(
    (id: string) => {
      clearTimer(id);
      updateToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [clearTimer, updateToasts],
  );

  const markToastExiting = useCallback(
    (id: string, manual = false) => {
      clearTimer(id);
      updateToasts((current) =>
        current.map((toast) =>
          toast.id === id && !toast.status.startsWith("exiting")
            ? { ...toast, status: manual ? "exiting-manual" : "exiting" }
            : toast,
        ),
      );
      window.setTimeout(() => removeToast(id), TOAST_EXIT_MS);
    },
    [clearTimer, removeToast, updateToasts],
  );

  const startToastTimer = useCallback(
    (id: string, type: ToastType, durationMs = getToastDuration(type)) => {
      clearTimer(id);
      timersRef.current.set(id, {
        durationMs,
        remainingMs: durationMs,
        startedAtMs: Date.now(),
        timeoutId: window.setTimeout(() => markToastExiting(id), durationMs),
        type,
      });
    },
    [clearTimer, markToastExiting],
  );

  const pauseToastTimer = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (!timer) return;

    window.clearTimeout(timer.timeoutId);
    const elapsedMs = Date.now() - timer.startedAtMs;
    timersRef.current.set(id, {
      ...timer,
      remainingMs: Math.max(timer.remainingMs - elapsedMs, 0),
      timeoutId: 0,
    });
  }, []);

  const resumeToastTimer = useCallback(
    (id: string) => {
      const timer = timersRef.current.get(id);
      if (!timer || timer.timeoutId) return;

      const remainingMs = timer.remainingMs;
      timersRef.current.set(id, {
        ...timer,
        durationMs: remainingMs,
        remainingMs,
        startedAtMs: Date.now(),
        timeoutId: window.setTimeout(() => markToastExiting(id), remainingMs),
      });
    },
    [markToastExiting],
  );

  const dismissToast = useCallback(
    (id: string) => {
      markToastExiting(id, true);
    },
    [markToastExiting],
  );

  const showToast = useCallback(
    (input: ToastInput) => {
      const type = input.type ?? "info";
      const existingToast = toastsRef.current.find(
        (toast) =>
          !toast.status.startsWith("exiting") &&
          toast.title === input.title &&
          toast.body === input.body &&
          toast.type === type,
      );
      if (existingToast) {
        startToastTimer(existingToast.id, existingToast.type);
        return existingToast.id;
      }

      const id = createToastId();

      updateToasts((current) => {
        const next: ToastItem[] = [
          ...current,
          {
            id,
            title: input.title,
            body: input.body,
            type,
            status: "entering",
          },
        ];
        const visible = next.filter((toast) => !toast.status.startsWith("exiting"));
        const overflowCount = Math.max(visible.length - MAX_TOASTS, 0);
        if (overflowCount <= 0) return next;

        const overflowIds = new Set(
          visible.slice(0, overflowCount).map((toast) => toast.id),
        );
        for (const overflowId of overflowIds) {
          clearTimer(overflowId);
          window.setTimeout(() => removeToast(overflowId), TOAST_EXIT_MS);
        }
        return next.map((toast) =>
          overflowIds.has(toast.id) ? { ...toast, status: "exiting" } : toast,
        );
      });

      window.setTimeout(() => {
        updateToasts((current) =>
          current.map((toast) =>
            toast.id === id && toast.status === "entering"
              ? { ...toast, status: "visible" }
              : toast,
          ),
        );
      }, 20);

      startToastTimer(id, type);
      return id;
    },
    [clearTimer, removeToast, startToastTimer, updateToasts],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer.timeoutId));
      timersRef.current.clear();
    },
    [],
  );

  const value = useMemo(
    () => ({ showToast, dismissToast, pauseToastTimer, resumeToastTimer }),
    [dismissToast, pauseToastTimer, resumeToastTimer, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        onExited={removeToast}
        onPause={pauseToastTimer}
        onResume={resumeToastTimer}
      />
    </ToastContext.Provider>
  );
}

// === Helpers ===

function getToastDuration(type: ToastType) {
  return type === "danger" ? DANGER_TOAST_MS : DEFAULT_TOAST_MS;
}

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// === Constants ===

export const MAX_TOASTS = 4;
export const TOAST_EXIT_MS = 275;
export const DEFAULT_TOAST_MS = 4500;
export const DANGER_TOAST_MS = 9000;

// === Types ===

type ToastTimer = {
  durationMs: number;
  remainingMs: number;
  startedAtMs: number;
  timeoutId: number;
  type: ToastType;
};
