"use client";

import type { FormEventHandler, RefObject } from "react";
import TurnstileField, {
  type TurnstileFieldHandle,
} from "@/components/security/TurnstileField";
import { Button } from "@/components/ui/button";
import { FieldLabel, FieldMessage, TextInput } from "@/components/ui/form";

type AuthMode = "login" | "signup";

type AuthModeTabsProps = {
  mode: AuthMode;
  onModeToggle: () => void;
};

type AuthErrorBannerProps = {
  error: string;
};

type LoginFieldsProps = {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

type SignupFieldsProps = {
  email: string;
  password: string;
  signupStep: "email" | "password";
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
};

type ResetPasswordFieldsProps = {
  email: string;
  error: string;
  isSubmitting: boolean;
  emailIsValid: boolean;
  onEmailChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
};

type AuthSubmitButtonProps = {
  submitLabel: string;
  isSubmitting: boolean;
  isCheckingEmail: boolean;
};

type GoogleAuthButtonProps = {
  isSubmitting: boolean;
  onClick: () => void;
};

type TurnstileBlockProps = {
  mode: AuthMode;
  turnstileRef: RefObject<TurnstileFieldHandle | null>;
  onError: (message: string) => void;
};

export function AuthModeTabs({ mode, onModeToggle }: AuthModeTabsProps) {
  return (
    <p className="text-stone-600">
      {mode === "signup" ? "Already have an account?" : "No account?"}{" "}
      <button
        type="button"
        onClick={onModeToggle}
        className="font-medium text-orange-600 hover:text-orange-700"
      >
        {mode === "signup" ? "Log in" : "Create one"}
      </button>
    </p>
  );
}

export function AuthErrorBanner({ error }: AuthErrorBannerProps) {
  if (!error) return null;
  return <FieldMessage tone="error">{error}</FieldMessage>;
}

export function LoginFields({
  email,
  password,
  onEmailChange,
  onPasswordChange,
}: LoginFieldsProps) {
  return (
    <>
      <div>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <TextInput
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <TextInput
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder="Enter your password"
        />
      </div>
    </>
  );
}

export function SignupFields({
  email,
  password,
  signupStep,
  onEmailChange,
  onPasswordChange,
}: SignupFieldsProps) {
  return (
    <>
      <div>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <TextInput
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
        />
      </div>

      {signupStep === "password" ? (
        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <TextInput
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
      ) : null}
    </>
  );
}

export function ResetPasswordFields({
  email,
  error,
  isSubmitting,
  emailIsValid,
  onEmailChange,
  onSubmit,
  onCancel,
}: ResetPasswordFieldsProps) {
  return (
    <div>
      <h2 className="mb-2 text-center text-2xl font-semibold text-stone-900">
        Enter your email to reset password
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="reset-email">Email</FieldLabel>
          <TextInput
            id="reset-email"
            type="email"
            required
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !emailIsValid}
          isLoading={isSubmitting}
          loadingLabel="Submitting reset request..."
          className="w-full"
        >
          Reset password
        </Button>

        <div className="text-center">
          <AuthErrorBanner error={error} />
        </div>
      </form>

      <div className="mt-5 flex flex-col items-center text-xs">
        <button
          type="button"
          onClick={onCancel}
          className="font-medium text-orange-600 hover:text-orange-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AuthSubmitButton({
  submitLabel,
  isSubmitting,
  isCheckingEmail,
}: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={isSubmitting || isCheckingEmail}
      isLoading={isCheckingEmail || isSubmitting}
      loadingLabel={isCheckingEmail ? "Checking account..." : "Submitting..."}
      className="w-full"
    >
      {submitLabel}
    </Button>
  );
}

export function GoogleAuthButton({
  isSubmitting,
  onClick,
}: GoogleAuthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isSubmitting}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="-0.5 -0.5 19 19"
        aria-hidden="true"
        className="block flex-none"
      >
        <path
          fill="#4285f4"
          fillOpacity="1"
          fillRule="evenodd"
          stroke="none"
          d="M17.64 9.2q-.002-.956-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        />
        <path
          fill="#34a853"
          fillOpacity="1"
          fillRule="evenodd"
          stroke="none"
          d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.26c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18"
        />
        <path
          fill="#fbbc05"
          fillOpacity="1"
          fillRule="evenodd"
          stroke="none"
          d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042z"
        />
        <path
          fill="#ea4335"
          fillOpacity="1"
          fillRule="evenodd"
          stroke="none"
          d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71"
        />
      </svg>
      <span className="relative top-[1px]">Continue with Google</span>
    </button>
  );
}

export function TurnstileBlock({
  mode,
  turnstileRef,
  onError,
}: TurnstileBlockProps) {
  if (mode !== "signup") return null;
  return (
    <TurnstileField
      ref={turnstileRef as RefObject<TurnstileFieldHandle>}
      onError={onError}
    />
  );
}
