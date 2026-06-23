"use client";

import { useMemo } from "react";
import EmailVerificationResult from "./EmailVerificationResult";

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
  isLocked = false,
}: EmailVerificationPanelProps) {
  const title = useMemo(() => {
    if (resendState === "sent") {
      return "We sent a fresh verification email.";
    }
    return "Verify your email address";
  }, [resendState]);

  const message = useMemo(() => {
    const target = email || "your inbox";
    if (resendState === "sent") {
      return `We just resent the verification link to ${target}. Click it, then return here to continue with ${next}.`;
    }
    if (resendState === "error") {
      return (
        resendMessage ||
        `We could not resend the link to ${target}. Check the address and try again.`
      );
    }
    return `We sent a verification link to ${target}. Open it to finish creating your account, then come back to continue with ${next}.`;
  }, [email, next, resendMessage, resendState]);

  const showCooldown = resendCooldownSeconds > 0;

  return (
    <EmailVerificationResult
      status={resendState === "error" ? "error" : "pending"}
      title={title}
      message={message}
      actionLabel="I've confirmed my email"
      onAction={isLocked ? undefined : onVerified}
      isActionLoading={isLocked}
      footer={
        <div className="space-y-4 text-left">
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700">
            <p className="font-semibold text-stone-900">Need a resend?</p>
            <p className="mt-1">
              Double-check that {email || "your email"} is spelled correctly and check your spam or
              junk folder before trying again.
            </p>
          </div>

          {showCooldown ? (
            <p className="text-center text-sm font-medium text-stone-700">
              Resend in {resendCooldownSeconds}s
            </p>
          ) : (
            <div className="space-y-3 rounded-xl border border-stone-200 bg-white px-4 py-4">
              <label className="flex items-start gap-3 text-sm leading-6 text-stone-700">
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
                disabled={!troubleshootingChecked || isLocked || resendState === "sending"}
                className="w-full rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Resend confirmation email
              </button>
            </div>
          )}

          {onUseDifferentEmail ? (
            <button
              type="button"
              onClick={onUseDifferentEmail}
              className="mx-auto block text-xs font-medium text-orange-600 transition-colors hover:text-orange-700"
            >
              Use a different email
            </button>
          ) : null}
        </div>
      }
    />
  );
}
