"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toastMessages } from "@/components/toasts/toastMessages";
import { useToast } from "@/components/toasts/toasts";
import { Button } from "@/components/ui/button";
import { FieldLabel, FieldMessage, TextInput } from "@/components/ui/form";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdateComplete, setIsUpdateComplete] = useState(false);
  const [error, setError] = useState("");
  const submitLockedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      if (!supabase) {
        if (!isMounted) return;
        showToast(toastMessages.authNotConfigured);
        setIsCheckingSession(false);
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (sessionError) {
        showToast({
          ...toastMessages.resetLinkCheckFailed,
          body: sessionError.message,
        });
      }

      setHasSession(Boolean(data.session));
      setIsCheckingSession(false);
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [showToast, supabase]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLockedRef.current || isSubmitting || isUpdateComplete) return;

    setError("");

    if (!supabase) {
      showToast(toastMessages.authNotConfigured);
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
      showToast(toastMessages.passwordUpdated);
      window.setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1000);
    } catch (updateError) {
      showToast({
        ...toastMessages.passwordUpdateFailed,
        body:
          updateError instanceof Error
            ? updateError.message
            : toastMessages.passwordUpdateFailed.body,
      });
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
        <Button
          type="button"
          onClick={() => router.push("/login")}
          className="w-full"
        >
          Back to log in
        </Button>
        {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}
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
          <FieldLabel
            htmlFor="new-password"
          >
            New password
          </FieldLabel>
          <TextInput
            id="new-password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            disabled={formDisabled}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <FieldLabel
            htmlFor="confirm-password"
          >
            Confirm password
          </FieldLabel>
          <TextInput
            id="confirm-password"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            disabled={formDisabled}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter password"
          />
        </div>

        <Button
          type="submit"
          disabled={formDisabled}
          isLoading={isSubmitting || isUpdateComplete}
          loadingLabel={isUpdateComplete ? "Redirecting..." : "Updating..."}
          className="w-full"
        >
          Update password
        </Button>
      </form>

      <div className="mt-4 text-center">
        {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}
      </div>
    </div>
  );
}
