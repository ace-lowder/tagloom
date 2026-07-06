"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleX, Info, X } from "lucide-react";

import { TOAST_EXIT_MS } from "@/components/toasts/ToastProvider";
import type { ToastItem, ToastType } from "@/components/toasts/toasts";
import { cn } from "@/lib/utils";

// === Components ===

export function ToastStack({
  toasts,
  onDismiss,
  onExited,
  onPause,
  onResume,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onExited: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}) {
  const toastRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const previousOffsetsRef = useRef<Map<string, number>>(new Map());
  const exitingOffsetsRef = useRef<Map<string, number>>(new Map());
  const exitFallbacksRef = useRef<Map<string, number>>(new Map());
  const [heights, setHeights] = useState<Record<string, number>>({});

  const setToastRef = useCallback(
    (id: string) => (node: HTMLDivElement | null) => {
      if (node) {
        toastRefs.current.set(id, node);
        setHeights((current) => {
          const nextHeight = Math.ceil(node.getBoundingClientRect().height);
          if (current[id] === nextHeight) return current;
          return { ...current, [id]: nextHeight };
        });
        return;
      }

      toastRefs.current.delete(id);
    },
    [],
  );

  const offsets = useMemo(() => {
    const nextOffsets = new Map<string, number>();
    let nextOffset = 0;

    for (const toast of toasts) {
      if (toast.status.startsWith("exiting")) continue;
      nextOffsets.set(toast.id, nextOffset);
      nextOffset += (heights[toast.id] || ESTIMATED_TOAST_HEIGHT) + TOAST_GAP_PX;
    }

    for (const toast of toasts) {
      if (!toast.status.startsWith("exiting")) continue;
      if (!exitingOffsetsRef.current.has(toast.id)) {
        exitingOffsetsRef.current.set(
          toast.id,
          previousOffsetsRef.current.get(toast.id) ?? nextOffsets.get(toast.id) ?? 0,
        );
      }
    }

    previousOffsetsRef.current = nextOffsets;
    return nextOffsets;
  }, [heights, toasts]);

  useLayoutEffect(() => {
    const nextHeights: Record<string, number> = {};
    let changed = false;

    for (const toast of toasts) {
      const node = toastRefs.current.get(toast.id);
      if (!node) continue;
      const nextHeight = Math.ceil(node.getBoundingClientRect().height);
      nextHeights[toast.id] = nextHeight;
      if (heights[toast.id] !== nextHeight) {
        changed = true;
      }
    }

    if (Object.keys(heights).length !== Object.keys(nextHeights).length) {
      changed = true;
    }

    if (changed) setHeights(nextHeights);
  }, [heights, toasts]);

  useLayoutEffect(() => {
    const activeIds = new Set(toasts.map((toast) => toast.id));
    for (const id of Array.from(exitingOffsetsRef.current.keys())) {
      if (!activeIds.has(id)) exitingOffsetsRef.current.delete(id);
    }
    for (const [id, timeoutId] of Array.from(exitFallbacksRef.current.entries())) {
      if (!activeIds.has(id)) {
        window.clearTimeout(timeoutId);
        exitFallbacksRef.current.delete(id);
      }
    }

    for (const toast of toasts) {
      if (!toast.status.startsWith("exiting") || exitFallbacksRef.current.has(toast.id)) {
        continue;
      }
      const timeoutId = window.setTimeout(() => {
        exitFallbacksRef.current.delete(toast.id);
        onExited(toast.id);
      }, TOAST_EXIT_MS + 40);
      exitFallbacksRef.current.set(toast.id, timeoutId);
    }
  }, [onExited, toasts]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[200] sm:inset-x-auto sm:right-5 sm:w-96 sm:max-w-[calc(100vw-2.5rem)]"
    >
      {toasts.map((toast) => {
        const offset = toast.status.startsWith("exiting")
          ? exitingOffsetsRef.current.get(toast.id) ?? 0
          : offsets.get(toast.id) ?? 0;

        return (
          <ToastCard
            key={toast.id}
            offset={offset}
            onDismiss={onDismiss}
            onExited={onExited}
            onPause={onPause}
            onResume={onResume}
            setToastRef={setToastRef(toast.id)}
            toast={toast}
          />
        );
      })}
    </div>
  );
}

function ToastCard({
  offset,
  onDismiss,
  onExited,
  onPause,
  onResume,
  setToastRef,
  toast,
}: {
  offset: number;
  onDismiss: (id: string) => void;
  onExited: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  setToastRef: (node: HTMLDivElement | null) => void;
  toast: ToastItem;
}) {
  const Icon = toastIcons[toast.type];
  const isExiting = toast.status.startsWith("exiting");
  const y = isExiting ? -offset + 8 : -offset;

  return (
    <div
      ref={setToastRef}
      role="status"
      data-stack-offset={offset}
      data-status={toast.status}
      className={cn(
        "pointer-events-auto absolute bottom-0 left-0 right-0 flex gap-3 rounded-xl border bg-white p-4 shadow-lg shadow-stone-900/10 transition-[opacity,transform] duration-[275ms] ease-out sm:left-auto sm:w-96",
        toastToneClasses[toast.type],
        toast.status === "entering" && "opacity-0",
        toast.status === "visible" && "opacity-100",
        isExiting && "opacity-0",
      )}
      style={{
        transform: `translate3d(0, ${y}px, 0) scale(${isExiting ? 0.98 : 1})`,
      }}
      onMouseEnter={() => onPause(toast.id)}
      onMouseLeave={() => onResume(toast.id)}
      onFocus={() => onPause(toast.id)}
      onBlur={() => onResume(toast.id)}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && isExiting) {
          onExited(toast.id);
        }
      }}
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

const TOAST_GAP_PX = 12;
const ESTIMATED_TOAST_HEIGHT = 92;

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
