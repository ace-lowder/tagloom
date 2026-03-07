"use client";

import { useEffect, useState } from "react";
import AuthForm from "@/components/auth/AuthForm";
import { sanitizeNextPath, type AuthMode } from "@/lib/authModal";

export default function LoginPage() {
  const [next, setNext] = useState("/");
  const [mode, setMode] = useState<AuthMode>("login");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(sanitizeNextPath(params.get("next")));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-5 pb-12 pt-28">
      <div className="w-full rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600">Tagloom</p>
        <AuthForm
          mode={mode}
          onModeChange={setMode}
          next={next}
          preferGooglePopup={false}
          showHeading
        />
      </div>
    </main>
  );
}
