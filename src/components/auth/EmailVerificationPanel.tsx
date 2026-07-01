"use client";

import { useEffect, useMemo, useState } from "react";

type EmailVerificationPanelProps = {
  email: string;
  next: string;
  resendCooldownSeconds: number;
  resendState: "idle" | "sending" | "sent" | "error";
  resendMessage: string | null;
  troubleshootingChecked: boolean;
  onTroubleshootingCheckedChange: (checked: boolean) => void;
  onResend: () => void;
  onVerified: () => void;
  onUseDifferentEmail?: () => void;
  onCancel?: () => void;
  isLocked?: boolean;
};

export default function EmailVerificationPanel({
  email,
  next,
  resendCooldownSeconds,
  resendState,
  resendMessage,
  troubleshootingChecked,
  onTroubleshootingCheckedChange,
  onResend,
  onVerified,
  onUseDifferentEmail,
  onCancel,
  isLocked = false,
}: EmailVerificationPanelProps) {
  const [showResendView, setShowResendView] = useState(false);

  useEffect(() => {
    if (resendState === "sent") {
      setShowResendView(false);
    }
  }, [resendState]);

  const nextPrompt = useMemo(() => {
    return next.includes("guest_generation")
      ? "Confirm your account to claim your free tag generation."
      : "Confirm your account to continue.";
  }, [next]);

  const displayEmail = email || "your email";
  const resendLabel =
    resendState === "sending"
      ? "Sending..."
      : resendCooldownSeconds > 0
        ? `Resend in ${resendCooldownSeconds}s`
        : "Resend confirmation email";
  const resendDisabled =
    resendCooldownSeconds > 0 || !troubleshootingChecked || isLocked || resendState === "sending";

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-semibold text-stone-900">
        {showResendView ? "Didn't get the email?" : "Verify your email address"}
      </h2>

      {showResendView ? (
        <div className="space-y-5">
          {resendState === "error" ? (
            <p className="text-sm leading-6 text-rose-600">
              {resendMessage ||
                `We could not resend the verification link to ${displayEmail}. Please try again in a moment.`}
            </p>
          ) : null}

          <p className="text-sm leading-6 text-stone-700">
            Double-check that{" "}
            <strong className="font-semibold text-stone-900">{displayEmail}</strong> is spelled
            correctly and check your spam or junk folder before trying again.
          </p>

          <label className="flex items-start gap-3 text-left text-sm leading-6 text-stone-700">
            <input
              type="checkbox"
              checked={troubleshootingChecked}
              onChange={(event) => onTroubleshootingCheckedChange(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
            />
            <span>I confirmed my email address and checked my spam folder</span>
          </label>

          <button
            type="button"
            onClick={onResend}
            disabled={resendDisabled}
            className="w-full rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resendLabel}
          </button>

          <div className="flex flex-col items-center gap-3 pt-1 text-xs font-medium">
            {onUseDifferentEmail ? (
              <button
                type="button"
                onClick={onUseDifferentEmail}
                className="text-orange-600 transition-colors hover:text-orange-700"
              >
                Use a different email
              </button>
            ) : null}

            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="text-stone-500 transition-colors hover:text-stone-700"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-sm leading-6 text-stone-700">
            We sent a verification link to{" "}
            <strong className="font-semibold text-stone-900">{displayEmail}</strong>. {nextPrompt}
          </p>

          {resendState === "sent" ? (
            <p className="text-sm font-medium leading-6 text-orange-600">
              We sent a fresh verification link to{" "}
              <strong className="font-semibold text-stone-900">{displayEmail}</strong>.{" "}
              {nextPrompt}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onVerified}
            disabled={isLocked}
            className="w-full rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            I&apos;ve confirmed my email
          </button>

          <div className="flex flex-col items-center gap-3 pt-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setShowResendView(true)}
              className="text-orange-600 transition-colors hover:text-orange-700"
            >
              Resend confirmation email
            </button>

            {onUseDifferentEmail ? (
              <button
                type="button"
                onClick={onUseDifferentEmail}
                className="text-orange-600 transition-colors hover:text-orange-700"
              >
                Use a different email
              </button>
            ) : null}

            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="text-stone-500 transition-colors hover:text-stone-700"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
