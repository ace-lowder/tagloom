"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { dispatchAuthSuccess, sanitizeNextPath } from "@/lib/authModal";
import { buildAuthCallbackUrl } from "@/lib/authRedirect";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { writeSignupCooldown } from "./authFormHelpers";
import type { TurnstileFieldHandle } from "@/components/security/TurnstileField";
import { toastMessages } from "@/components/toasts/toastMessages";
import { useToast, type ToastInput } from "@/components/toasts/toasts";
import EmailVerificationPanel from "./EmailVerificationPanel";
import {
  AuthErrorBanner,
  AuthModeTabs,
  AuthSubmitButton,
  GoogleAuthButton,
  LoginFields,
  ResetPasswordFields,
  SignupFields,
  TurnstileBlock,
} from "./AuthFormSections";
import {
  checkSignupEligibility,
  getEmailAccountStatus,
  hasRecentSignupCooldown,
  isValidEmail,
  normalizeEmail,
  type EmailAccountStatus,
} from "./authFormHelpers";
import { isEmailVerified } from "@/lib/auth";
import { useEmailVerification } from "./useEmailVerification";

type AuthFormMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthFormMode;
  onModeChange: (mode: AuthFormMode) => void;
  next?: string;
  preferGooglePopup?: boolean;
  onAuthSuccess?: () => void;
  onVerificationPendingChange?: (pending: boolean) => void;
  showHeading?: boolean;
  compact?: boolean;
};

export default function AuthForm({
  mode,
  onModeChange,
  next = "/",
  onAuthSuccess,
  onVerificationPendingChange,
  showHeading = true,
  compact = false,
}: AuthFormProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupStep, setSignupStep] = useState<"email" | "password">(
    mode === "signup" ? "email" : "password",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<
    "auth" | "reset_password" | "reset_password_sent" | "verify_email"
  >("auth");

  const emailStatusCacheRef = useRef<Map<string, EmailAccountStatus>>(new Map());
  const didCompleteSuccessRef = useRef(false);
  const turnstileRef = useRef<TurnstileFieldHandle | null>(null);
  const isVerificationLocked = view === "verify_email";

  const verification = useEmailVerification({
    supabase,
    onVerified: (record) => {
      completeSuccess(record.next);
    },
    onPendingChange: onVerificationPendingChange,
  });
  const verificationNext = verification.record?.next ?? sanitizeNextPath(next);

  useEffect(() => {
    if (mode === "login") {
      setSignupStep("password");
      return;
    }

    if (!password) {
      setSignupStep("email");
    }
  }, [mode, password]);

  useEffect(() => {
    if (verification.record) {
      setEmail(verification.record.email);
      setView("verify_email");
      setError("");
      return;
    }

    if (view === "verify_email") {
      setView("auth");
      setError("");
    }
  }, [verification.record, view]);

  const heading = mode === "signup" ? "Create your account" : "Log in";

  const description =
    mode === "signup"
      ? "Create an account to unlock your first free generation."
      : "Sign in with email/password or continue with Google.";
  const normalizedEmail = normalizeEmail(email);
  const emailIsValid = isValidEmail(normalizedEmail);

  const completeSuccess = (destination = verificationNext) => {
    if (didCompleteSuccessRef.current) return;
    didCompleteSuccessRef.current = true;
    dispatchAuthSuccess();
    router.push(sanitizeNextPath(destination));
    router.refresh();
    onAuthSuccess?.();
  };

  const beginVerification = (emailToUse: string) => {
    const existingRecord =
      verification.record?.email === emailToUse ? verification.record : null;
    verification.startVerification({
      email: emailToUse,
      next,
      createdAt: existingRecord ? existingRecord.createdAt : Date.now(),
      emailSentAt: existingRecord ? existingRecord.emailSentAt : Date.now(),
    });
    setEmail(emailToUse);
    setPassword("");
    setView("verify_email");
    setError("");
  };

  const resetToLoginForm = (emailToUse: string) => {
    onModeChange("login");
    setEmail(emailToUse);
    setPassword("");
    setSignupStep("password");
    setView("auth");
    setError("");
  };

  const resetToSignupEmailStep = () => {
    onModeChange("signup");
    setEmail("");
    setPassword("");
    setSignupStep("email");
    setView("auth");
    setError("");
  };

  const getCachedAccountStatus = async (emailToCheck: string) => {
    const cached = emailStatusCacheRef.current.get(emailToCheck);
    if (cached) return cached;

    const status = await getEmailAccountStatus(emailToCheck);
    emailStatusCacheRef.current.set(emailToCheck, status);
    return status;
  };

  const showAuthFailure = (baseToast: ToastInput, authError: unknown) => {
    showToast({
      ...baseToast,
      body: authError instanceof Error ? authError.message : baseToast.body,
    });
  };

  const getGoogleAuthErrorToast = (authError: unknown): ToastInput => {
    const message = authError instanceof Error ? authError.message : "";

    if (message === "access_denied") {
      return {
        title: "Google sign-in canceled",
        body: "You can try again when you're ready.",
        type: "danger",
      };
    }

    if (message.toLowerCase().includes("pkce code verifier not found")) {
      return {
        title: "Google sign-in failed",
        body: "Please try signing in with Google again.",
        type: "danger",
      };
    }

    return {
      ...toastMessages.googleLoginFailed,
      body: message || toastMessages.googleLoginFailed.body,
    };
  };

  const onEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!supabase) {
      showToast(toastMessages.authNotConfigured);
      return;
    }

    if (mode === "signup" && signupStep === "email") {
      if (!emailIsValid) {
        setError("Enter a valid email first.");
        return;
      }
    }

    try {
      if (mode === "signup" && signupStep === "email") {
        setIsCheckingEmail(true);
        try {
          const status = await getCachedAccountStatus(normalizedEmail);

          if (status === "verified") {
            resetToLoginForm(normalizedEmail);
            return;
          }

          if (status === "unverified") {
            beginVerification(normalizedEmail);
            return;
          }
        } catch (checkError) {
          console.error("/api/auth/email-exists lookup failed", checkError);
          showToast({
            ...toastMessages.accountCheckFailed,
            body:
              checkError instanceof Error
                ? checkError.message
                : toastMessages.accountCheckFailed.body,
          });
          return;
        } finally {
          setIsCheckingEmail(false);
        }

        setSignupStep("password");
        return;
      }

      setIsSubmitting(true);

      if (mode === "signup") {
        if (hasRecentSignupCooldown()) {
          showToast(toastMessages.signupBlockedCooldown);
          return;
        }

        const turnstileToken = await turnstileRef.current?.getToken();
        if (!turnstileToken) {
          showToast(toastMessages.botCheckFailed);
          return;
        }

        await checkSignupEligibility(turnstileToken);

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildAuthCallbackUrl(next, "email_verification"),
          },
        });

        if (signUpError) {
          if (isSignupDeliveryBusyError(signUpError)) {
            showToast({
              title: "Verification email busy",
              body: "We couldn't send your confirmation email right now. Email delivery is temporarily busy. Your listing has been saved. Please try again shortly.",
              type: "danger",
            });
            return;
          }

          throw signUpError;
        }

        if (data.session && isEmailVerified(data.session.user)) {
          writeSignupCooldown();
          completeSuccess();
          return;
        }

        beginVerification(normalizedEmail);
        showToast(toastMessages.accountCreated);
        return;
      }

      const loginStatus = await getCachedAccountStatus(normalizedEmail);
      if (loginStatus === "unverified") {
        beginVerification(normalizedEmail);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (isEmailNotConfirmedError(signInError)) {
        beginVerification(normalizedEmail);
        setError("Confirm your email to continue.");
        return;
      }

      if (signInError) throw signInError;
      completeSuccess();
    } catch (authError) {
      showAuthFailure(
        mode === "signup" ? toastMessages.signupFailed : toastMessages.loginFailed,
        authError,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fallbackGoogleRedirect = async () => {
    if (!supabase) return;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildAuthCallbackUrl(next, "redirect"),
      },
    });

    if (oauthError) throw oauthError;
  };

  const onGoogleAuth = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      if (!supabase) {
        showToast(toastMessages.authNotConfigured);
        return;
      }

      await fallbackGoogleRedirect();
    } catch (authError) {
      showToast(getGoogleAuthErrorToast(authError));
      setIsSubmitting(false);
    }
  };

  const submitLabel =
    mode === "signup"
      ? signupStep === "email"
        ? "Continue with email"
        : "Create account"
      : "Log in";

  const onResetPassword = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      if (!supabase) {
        showToast(toastMessages.authNotConfigured);
        return;
      }

      if (!emailIsValid) {
        setError("Enter a valid email first.");
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: buildAuthCallbackUrl("/reset-password"),
        },
      );

      if (resetError) throw resetError;
      setView("reset_password_sent");
      showToast(toastMessages.resetPasswordEmailSent);
    } catch (authError) {
      showAuthFailure(toastMessages.resetPasswordRequestFailed, authError);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === "reset_password") {
    return (
      <ResetPasswordFields
        email={email}
        error={error}
        isSubmitting={isSubmitting}
        emailIsValid={emailIsValid}
        onEmailChange={setEmail}
        onSubmit={(event) => {
          event.preventDefault();
          onResetPassword();
        }}
        onCancel={() => {
          setView("auth");
          setError("");
        }}
      />
    );
  }

  if (view === "reset_password_sent") {
    return (
      <div>
        <p className="mx-auto w-72 text-left text-sm font-normal leading-relaxed text-stone-700">
          If an account exists for
          {" " + (email.trim() || "your email")}, you will get an email with
          instructions on resetting your password. If it doesn&apos;t arrive, be
          sure to check your spam folder.
        </p>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setView("auth");
              onModeChange("login");
              setError("");
            }}
            className="text-xs font-medium text-orange-600 hover:text-orange-700"
          >
            Back to Log in
          </button>
        </div>
      </div>
    );
  }

  if (view === "verify_email") {
    return (
      <EmailVerificationPanel
        email={verification.record?.email || normalizedEmail}
        next={verificationNext}
        resendCooldownSeconds={verification.resendCooldownSeconds}
        resendState={verification.resendStatus}
        resendMessage={verification.resendMessage}
        troubleshootingChecked={verification.troubleshootingChecked}
        onTroubleshootingCheckedChange={verification.setTroubleshootingChecked}
        isLocked={isSubmitting}
        onResend={() => {
          void verification.resendConfirmationEmail();
        }}
        onVerified={() => {
          void verification.requestManualVerificationCheck();
        }}
        onUseDifferentEmail={() => {
          verification.clearVerification();
          resetToSignupEmailStep();
        }}
        onCancel={() => {
          const emailToKeep = verification.record?.email || normalizedEmail;
          verification.clearVerification();
          resetToLoginForm(emailToKeep);
        }}
      />
    );
  }

  return (
    <div className={compact ? "space-y-4" : ""}>
      {showHeading ? (
        <>
          <h1 className="mb-2 text-2xl font-bold text-stone-900">{heading}</h1>
          <p className="mb-6 text-sm text-stone-500">{description}</p>
        </>
      ) : null}

      <form onSubmit={onEmailAuth} className="space-y-4">
        <GoogleAuthButton isSubmitting={isSubmitting} onClick={onGoogleAuth} />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-stone-200" />
          <span className="text-xs uppercase tracking-wide text-stone-400">or</span>
          <div className="h-px flex-1 bg-stone-200" />
        </div>

        <TurnstileBlock mode={mode} turnstileRef={turnstileRef} onError={setError} />

        {mode === "signup" ? (
          <SignupFields
            email={email}
            password={password}
            signupStep={signupStep}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
          />
        ) : (
          <LoginFields
            email={email}
            password={password}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
          />
        )}

        <AuthSubmitButton
          submitLabel={submitLabel}
          isSubmitting={isSubmitting}
          isCheckingEmail={isCheckingEmail}
        />
      </form>

      <div className="mt-2 text-center">
        <AuthErrorBanner error={error} />
      </div>

      <div className="mt-5 flex flex-col items-center gap-3 text-xs">
        {mode === "login" ? (
          <button
            type="button"
            onClick={() => {
              setError("");
              setView("reset_password");
            }}
            className="font-medium text-orange-600 hover:text-orange-700"
          >
            Reset password
          </button>
        ) : null}

        <AuthModeTabs
          mode={mode}
          onModeToggle={() => {
            onModeChange(mode === "signup" ? "login" : "signup");
            setError("");
          }}
        />
      </div>
    </div>
  );
}

function isEmailNotConfirmedError(error: unknown) {
  return (error as { code?: string } | null)?.code === "email_not_confirmed";
}

function isSignupDeliveryBusyError(error: unknown) {
  return (error as { status?: number } | null)?.status === 429;
}
