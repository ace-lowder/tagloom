"use client";

import { useMemo } from "react";
import EmailVerificationResult from "./EmailVerificationResult";

type EmailVerificationPanelProps = {
  email: string;
  next: string;
  resendState: "idle" | "sending" | "sent" | "error";
  resendMessage: string | null;
  isLocked?: boolean;
  onResend: () => void;
  onVerified: () => void;
  onBack?: () => void;
};

export default function EmailVerificationPanel({
  email,
  next,
  resendState,
  resendMessage,
  isLocked = false,
  onResend,
  onVerified,
  onBack,
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

  return (
    <EmailVerificationResult
      status={resendState === "error" ? "error" : "pending"}
      title={title}
      message={message}
      actionLabel={isLocked ? "Verifying..." : "Resend verification email"}
      onAction={isLocked ? undefined : onResend}
      secondaryLabel="I verified my email"
      onSecondary={onVerified}
      isActionLoading={isLocked || resendState === "sending"}
      footer={
        onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mx-auto block text-xs font-medium text-orange-600 transition-colors hover:text-orange-700"
          >
            Use a different email
          </button>
        ) : null
      }
    />
  );
}
