"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdateComplete, setIsUpdateComplete] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submitLockedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      if (!supabase) {
        if (!isMounted) return;
        setError("Auth is not configured.");
        setIsCheckingSession(false);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (sessionError) {
        setError(sessionError.message);
      }

      setHasSession(Boolean(data.session));
      setIsCheckingSession(false);
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLockedRef.current || isSubmitting || isUpdateComplete) return;

    setError("");
    setNotice("");

    if (!supabase) {
      setError("Auth is not configured.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    submitLockedRef.current = true;
    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setIsUpdateComplete(true);
      setNotice("Your password has been updated.");
      window.setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1000);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update password.",
      );
      submitLockedRef.current = false;
      setIsSubmitting(false);
    } finally {
      if (!isUpdateComplete) {
        setIsSubmitting(false);
      }
    }
  };

  const formDisabled = isSubmitting || isUpdateComplete;

  if (isCheckingSession) {
    return (
      <p className="text-center text-sm font-medium text-stone-700">
        Checking reset link...
      </p>
    );
  }

  if (!hasSession) {
    return (
      <div className="space-y-5 text-center">
        <div>
          <h1 className="mb-2 text-2xl font-semibold text-stone-900">
            Reset link expired
          </h1>
          <p className="text-sm leading-relaxed text-stone-600">
            Request a new password reset email, then open the latest link from
            your inbox.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
        >
          Back to log in
        </button>
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-center text-2xl font-semibold text-stone-900">
        Set a new password
      </h1>
      <p className="mb-6 text-center text-sm text-stone-500">
        Choose a new password for your account.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="new-password"
            className="mb-1.5 block text-sm font-medium text-stone-700"
          >
            New password
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            disabled={formDisabled}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1.5 block text-sm font-medium text-stone-700"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            disabled={formDisabled}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            placeholder="Re-enter password"
          />
        </div>

        <button
          type="submit"
          disabled={formDisabled}
          className="w-full rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUpdateComplete ? (
            "Redirecting..."
          ) : isSubmitting ? (
            <>
              <span
                className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white align-[-3px]"
                aria-hidden="true"
              />
              Updating...
            </>
          ) : (
            "Update password"
          )}
        </button>
      </form>

      <div className="mt-4 text-center">
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
        {notice ? <p className="text-xs text-green-700">{notice}</p> : null}
      </div>
    </div>
  );
}
