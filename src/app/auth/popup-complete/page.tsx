"use client";

import { useEffect } from "react";
import { AUTH_POPUP_MESSAGE_SOURCE } from "@/lib/authModal";

type PopupCompletePageProps = {
  searchParams: {
    status?: string;
    message?: string;
    next?: string;
  };
};

export default function PopupCompletePage({ searchParams }: PopupCompletePageProps) {
  useEffect(() => {
    const status = searchParams.status === "success" ? "tagloom:auth-success" : "tagloom:auth-error";
    const message = searchParams.message || undefined;

    if (window.opener) {
      window.opener.postMessage(
        {
          source: AUTH_POPUP_MESSAGE_SOURCE,
          type: status,
          message,
        },
        window.location.origin,
      );
    }

    window.setTimeout(() => {
      window.close();
    }, 80);
  }, [searchParams.message, searchParams.status]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-stone-900">
          {searchParams.status === "success" ? "Signing you in..." : "Could not finish sign-in"}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          {searchParams.status === "success"
            ? "You can close this window."
            : searchParams.message || "Please return to the previous window and try again."}
        </p>
      </div>
    </main>
  );
}
