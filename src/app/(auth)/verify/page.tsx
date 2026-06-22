"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import EmailVerificationResult from "@/components/auth/EmailVerificationResult";
import { dispatchAuthSuccess, sanitizeNextPath } from "@/lib/authModal";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [didRedirect, setDidRedirect] = useState(false);

  const status = searchParams.get("status");
  const next = useMemo(
    () => sanitizeNextPath(searchParams.get("next")),
    [searchParams],
  );
  const message = searchParams.get("message");

  useEffect(() => {
    if (status !== "success" || didRedirect) return;

    dispatchAuthSuccess();
    const timeout = window.setTimeout(() => {
      setDidRedirect(true);
      router.replace(next);
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [didRedirect, next, router, status]);

  if (status === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5 py-10">
        <div className="w-full max-w-sm">
          <EmailVerificationResult
            status="success"
            title="Email verified"
            message="Your account is ready. We are taking you back to the listing now."
            actionLabel="Continue now"
            onAction={() => router.replace(next)}
            secondaryLabel="Go to home"
            onSecondary={() => router.replace("/")}
          />
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5 py-10">
        <div className="w-full max-w-sm">
          <EmailVerificationResult
            status="error"
            title="Could not verify your email"
            message={
              message || "Please open the newest verification link from your inbox."
            }
            actionLabel="Back to log in"
            onAction={() => router.replace(`/login?next=${encodeURIComponent(next)}`)}
            secondaryLabel="Go home"
            onSecondary={() => router.replace("/")}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5 py-10">
      <div className="w-full max-w-sm">
        <EmailVerificationResult
          status="pending"
          title="Check your inbox"
          message="Open the verification email we sent, then return here if you need to finish the sign-in flow."
          actionLabel="Back to log in"
          onAction={() => router.replace(`/login?next=${encodeURIComponent(next)}`)}
          secondaryLabel="Go home"
          onSecondary={() => router.replace("/")}
        />
      </div>
    </main>
  );
}

