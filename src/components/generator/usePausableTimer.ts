"use client";

import { useCallback, useEffect, useRef } from "react";
import type { TimerMeta } from "./generatorTypes";

// === Hooks ===

export function usePausableTimer() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerMetaRef = useRef<TimerMeta>({
    callback: null,
    delayMs: 0,
    remainingMs: 0,
    startedAtMs: 0,
  });

  const setTimer = useCallback((callback: () => void, delayMs: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    timerMetaRef.current = {
      callback,
      delayMs,
      remainingMs: delayMs,
      startedAtMs: Date.now(),
    };
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const cb = timerMetaRef.current.callback;
      timerMetaRef.current = {
        callback: null,
        delayMs: 0,
        remainingMs: 0,
        startedAtMs: 0,
      };
      if (cb) cb();
    }, delayMs);
  }, []);

  const pauseTimer = useCallback(() => {
    if (!timeoutRef.current || !timerMetaRef.current.callback) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    const elapsed = Date.now() - timerMetaRef.current.startedAtMs;
    timerMetaRef.current.remainingMs = Math.max(
      timerMetaRef.current.delayMs - elapsed,
      0,
    );
  }, []);

  const resumeTimer = useCallback(() => {
    if (timeoutRef.current || !timerMetaRef.current.callback) return;
    const delayMs = timerMetaRef.current.remainingMs;
    timerMetaRef.current.delayMs = delayMs;
    timerMetaRef.current.startedAtMs = Date.now();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      const cb = timerMetaRef.current.callback;
      timerMetaRef.current = {
        callback: null,
        delayMs: 0,
        remainingMs: 0,
        startedAtMs: 0,
      };
      if (cb) cb();
    }, delayMs);
  }, []);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    timerMetaRef.current = {
      callback: null,
      delayMs: 0,
      remainingMs: 0,
      startedAtMs: 0,
    };
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    setTimer,
    pauseTimer,
    resumeTimer,
    clearTimer,
  };
}
