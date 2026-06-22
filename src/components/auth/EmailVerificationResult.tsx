"use client";

import type { ReactNode } from "react";

type EmailVerificationResultProps = {
  title: string;
  message: string;
  status: "pending" | "success" | "error";
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  footer?: ReactNode;
  isActionLoading?: boolean;
};

export default function EmailVerificationResult({
  title,
  message,
  status,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  footer,
  isActionLoading = false,
}: EmailVerificationResultProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-6 py-6 shadow-sm">
      <div className="space-y-3 text-center">
        <p
          className={`text-xs font-semibold uppercase tracking-[0.22em] ${
            status === "success"
              ? "text-emerald-600"
              : status === "error"
                ? "text-rose-600"
                : "text-orange-600"
          }`}
        >
          {status === "success"
            ? "Email verified"
            : status === "error"
              ? "Verification issue"
              : "Check your inbox"}
        </p>
        <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
        <p className="text-sm leading-6 text-stone-600">{message}</p>
      </div>

      {actionLabel || secondaryLabel ? (
        <div className="mt-5 flex flex-col gap-3">
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              disabled={isActionLoading}
              className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {actionLabel}
            </button>
          ) : null}

          {secondaryLabel && onSecondary ? (
            <button
              type="button"
              onClick={onSecondary}
              className="text-sm font-medium text-orange-600 transition-colors hover:text-orange-700"
            >
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}

