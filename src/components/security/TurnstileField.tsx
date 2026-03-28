"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_ID = "turnstile-api-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export type TurnstileFieldHandle = {
  getToken: () => Promise<string | null>;
};

type TurnstileFieldProps = {
  onError?: (message: string) => void;
};

function ensureTurnstileScriptLoaded() {
  if (typeof window === "undefined") return;
  if (document.getElementById(TURNSTILE_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = TURNSTILE_SCRIPT_ID;
  script.src = TURNSTILE_SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

const TurnstileField = forwardRef<TurnstileFieldHandle, TurnstileFieldProps>(
  function TurnstileField({ onError }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    const resolveRef = useRef<((token: string) => void) | null>(null);
    const rejectRef = useRef<((error: Error) => void) | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

    const clearPending = useCallback(() => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      resolveRef.current = null;
      rejectRef.current = null;
    }, []);

    const renderWidget = useCallback(() => {
      if (!siteKey) return;
      if (!containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        size: "invisible",
        callback: (token: string) => {
          const resolve = resolveRef.current;
          clearPending();
          resolve?.(token);
        },
        "expired-callback": () => {
          const reject = rejectRef.current;
          clearPending();
          reject?.(new Error("Bot check expired. Please try again."));
        },
        "error-callback": () => {
          const reject = rejectRef.current;
          clearPending();
          reject?.(new Error("Bot check failed. Please try again."));
        },
      });
    }, [clearPending, siteKey]);

    useEffect(() => {
      if (!siteKey) return;
      ensureTurnstileScriptLoaded();
      renderWidget();

      const interval = window.setInterval(() => {
        renderWidget();
      }, 150);

      const clearIntervalTimer = window.setTimeout(() => {
        window.clearInterval(interval);
      }, 5000);

      return () => {
        window.clearInterval(interval);
        window.clearTimeout(clearIntervalTimer);
        clearPending();
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
      };
    }, [clearPending, renderWidget, siteKey]);

    useImperativeHandle(
      ref,
      () => ({
        getToken: () =>
          new Promise<string | null>((resolve, reject) => {
            if (!siteKey) {
              resolve(null);
              return;
            }

            if (!window.turnstile || !widgetIdRef.current) {
              const error = new Error("Bot check is still loading. Please try again.");
              onError?.(error.message);
              reject(error);
              return;
            }

            try {
              window.turnstile.reset(widgetIdRef.current);
              resolveRef.current = resolve;
              rejectRef.current = reject;
              timeoutRef.current = window.setTimeout(() => {
                const pendingReject = rejectRef.current;
                clearPending();
                const error = new Error("Bot check timed out. Please try again.");
                onError?.(error.message);
                pendingReject?.(error);
              }, 15000);
              window.turnstile.execute(widgetIdRef.current);
            } catch (error) {
              clearPending();
              const message =
                error instanceof Error
                  ? error.message
                  : "Could not run bot check. Please try again.";
              onError?.(message);
              reject(new Error(message));
            }
          }),
      }),
      [clearPending, onError, siteKey],
    );

    if (!siteKey) return null;

    return <div ref={containerRef} className="hidden" aria-hidden="true" />;
  },
);

export default TurnstileField;
