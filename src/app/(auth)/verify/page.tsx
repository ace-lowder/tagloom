"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmailVerificationResult from "@/components/auth/EmailVerificationResult";
import { dispatchAuthSuccess, sanitizeNextPath } from "@/lib/authModal";

const VERIFIED_BROADCAST_CHANNEL = "tagloom-auth";
const VERIFIED_BROADCAST_MESSAGE = "email_verified";
const AUTO_REDIRECT_SECONDS = 5;

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyPagePending />}>
      <VerifyPageContent />
    </Suspense>
  );
}

type VerifyPageFrameProps = {
  actionLabel: string;
  footer?: ReactNode;
  message: string;
  onAction: () => void;
  status: "success" | "error" | "pending";
  title: string;
};

function VerifyPageFrame({
  actionLabel,
  footer,
  message,
  onAction,
  status,
  title,
}: VerifyPageFrameProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <EmailVerificationResult
          title={title}
          message={message}
          status={status}
          actionLabel={actionLabel}
          onAction={onAction}
          footer={footer}
        />
      </div>
    </main>
  );
}

function VerifyPagePending() {
  return (
    <VerifyPageFrame
      title="Check your inbox"
      message="Open the email confirmation link to finish creating your account."
      status="pending"
      actionLabel="Return to Log in"
      onAction={() => {}}
    />
  );
}

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const rawNext = searchParams.get("next");
  const next = useMemo(() => sanitizeNextPath(rawNext), [rawNext]);
  const [secondsRemaining, setSecondsRemaining] = useState(AUTO_REDIRECT_SECONDS);
  const autoRedirectTimerRef = useRef<number | null>(null);
  const didAnnounceSuccessRef = useRef(false);
  const didRedirectRef = useRef(false);
  const loginUrl = `/login?next=${encodeURIComponent(next)}`;

  const completeRedirect = useCallback(() => {
    if (didRedirectRef.current) return;
    didRedirectRef.current = true;
    if (autoRedirectTimerRef.current !== null) {
      window.clearInterval(autoRedirectTimerRef.current);
      autoRedirectTimerRef.current = null;
    }
    router.replace(next);
  }, [next, router]);

  const announceSuccess = useCallback(() => {
    if (didAnnounceSuccessRef.current) return;
    didAnnounceSuccessRef.current = true;
    dispatchAuthSuccess();

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel(VERIFIED_BROADCAST_CHANNEL);
      channel.postMessage({ type: VERIFIED_BROADCAST_MESSAGE });
      channel.close();
    }
  }, []);

  useEffect(() => {
    if (status !== "success") return;

    announceSuccess();
  }, [announceSuccess, status]);

  useEffect(() => {
    if (status !== "success") return;

    setSecondsRemaining(AUTO_REDIRECT_SECONDS);
    autoRedirectTimerRef.current = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          completeRedirect();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      if (autoRedirectTimerRef.current !== null) {
        window.clearInterval(autoRedirectTimerRef.current);
        autoRedirectTimerRef.current = null;
      }
    };
  }, [completeRedirect, status]);

  if (status === "success") {
    return (
      <VerifyPageFrame
        title="Email verified"
        message="Your account is ready. We're returning you to your listing so you can review it and use your free generation."
        status="success"
        actionLabel="Continue to my listing"
        onAction={completeRedirect}
        footer={
          <p className="text-center text-sm font-medium text-stone-600" aria-live="polite">
            Continuing automatically in {secondsRemaining}s
          </p>
        }
      />
    );
  }

  if (status === "error") {
    return (
      <VerifyPageFrame
        title="This verification link is no longer valid"
        message="The link may have expired or may already have been used. Return to Log in and request a new confirmation email."
        status="error"
        actionLabel="Return to Log in"
        onAction={() => router.replace(loginUrl)}
      />
    );
  }

  return <VerifyPagePending />;
}
