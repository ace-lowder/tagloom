"use client";

import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import { hasPendingEmailVerification } from "@/components/auth/emailVerificationStorage";
import { sanitizeNextPath, type AuthMode } from "@/lib/authModal";

function resolveSafeNext(rawNext: string | null) {
  const safeNext = sanitizeNextPath(rawNext);
  if (safeNext === "/login" || safeNext.startsWith("/login?")) {
    return "/";
  }
  return safeNext;
}

export default function LoginPage() {
  const router = useRouter();
  const [next, setNext] = useState("/");
  const [mode, setMode] = useState<AuthMode>("signup");
  const [verificationPending, setVerificationPending] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(resolveSafeNext(params.get("next")));
  }, []);

  useEffect(() => {
    const updatePending = () => {
      setVerificationPending(hasPendingEmailVerification());
    };

    updatePending();
    window.addEventListener("storage", updatePending);
    window.addEventListener("focus", updatePending);
    return () => {
      window.removeEventListener("storage", updatePending);
      window.removeEventListener("focus", updatePending);
    };
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <button
        type="button"
        onClick={() => router.push(next)}
        disabled={verificationPending}
        className="absolute left-5 top-6 inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-stone-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white px-6 pb-6 pt-12 shadow-2xl sm:px-7 sm:pb-7 sm:pt-12">
        <AuthForm
          mode={mode}
          onModeChange={setMode}
          next={next}
          preferGooglePopup
          onVerificationPendingChange={setVerificationPending}
          showHeading={false}
          compact
        />
      </div>
    </main>
  );
}
