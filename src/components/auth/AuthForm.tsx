"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AUTH_POPUP_MESSAGE_SOURCE } from "@/lib/authModal";
import { buildAuthCallbackUrl } from "@/lib/authRedirect";
import TurnstileField, {
  type TurnstileFieldHandle,
} from "@/components/security/TurnstileField";
import { toastMessages } from "@/components/toasts/toastMessages";
import { useToast, type ToastInput } from "@/components/toasts/toasts";
import { Button } from "@/components/ui/button";
import { FieldMessage, FieldLabel, TextInput } from "@/components/ui/form";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthFormMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthFormMode;
  onModeChange: (mode: AuthFormMode) => void;
  next?: string;
  preferGooglePopup?: boolean;
  onAuthSuccess?: () => void;
  showHeading?: boolean;
  compact?: boolean;
};

type PopupMessage = {
  source: string;
  type: "tagloom:auth-success" | "tagloom:auth-error";
  message?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function checkEmailExists(email: string) {
  const response = await fetch("/api/auth/email-exists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    exists?: boolean;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "Could not check account.");
  }

  return data.exists === true;
}

function centerPopup(width: number, height: number) {
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
  return `popup=yes,width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)}`;
}

const SIGNUP_COOLDOWN_KEY = "tagloom:signup-cooldown:v1";
const SIGNUP_COOLDOWN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
function hasRecentSignupCooldown() {
  if (typeof window === "undefined") return false;

  const raw = window.localStorage.getItem(SIGNUP_COOLDOWN_KEY);
  if (!raw) return false;

  const timestamp = Number(raw);
  if (!Number.isFinite(timestamp)) return false;

  return Date.now() - timestamp < SIGNUP_COOLDOWN_WINDOW_MS;
}

function writeSignupCooldown() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SIGNUP_COOLDOWN_KEY, String(Date.now()));
}

async function checkSignupEligibility(turnstileToken: string) {
  const response = await fetch("/api/auth/signup-eligibility", {
    method: "POST",
    headers: {
      "x-turnstile-token": turnstileToken,
    },
  });

  const data = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "Could not verify signup eligibility.");
  }

  return data.ok === true;
}

export default function AuthForm({
  mode,
  onModeChange,
  next = "/",
  preferGooglePopup = false,
  onAuthSuccess,
  showHeading = true,
  compact = false,
}: AuthFormProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<
    "auth" | "reset_password" | "reset_password_sent"
  >("auth");
  const [signupStep, setSignupStep] = useState<"email" | "password">(
    mode === "signup" ? "email" : "password",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState("");

  const emailExistsCacheRef = useRef<Map<string, boolean>>(new Map());
  const turnstileRef = useRef<TurnstileFieldHandle | null>(null);

  useEffect(() => {
    if (mode === "login") {
      setSignupStep("password");
      return;
    }

    if (!password) {
      setSignupStep("email");
    }
  }, [mode, password]);

  const heading = mode === "signup" ? "Create your account" : "Log in";

  const description =
    mode === "signup"
      ? "Create an account to unlock your first free generation."
      : "Sign in with email/password or continue with Google.";
  const normalizedEmail = normalizeEmail(email);
  const emailIsValid = isValidEmail(normalizedEmail);

  const completeSuccess = () => {
    if (onAuthSuccess) {
      onAuthSuccess();
      return;
    }

    router.push(next);
    router.refresh();
  };

  const showAuthFailure = (baseToast: ToastInput, authError: unknown) => {
    showToast({
      ...baseToast,
      body: authError instanceof Error ? authError.message : baseToast.body,
    });
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

      try {
        setIsCheckingEmail(true);
        let exists = emailExistsCacheRef.current.get(normalizedEmail);
        if (typeof exists !== "boolean") {
          exists = await checkEmailExists(normalizedEmail);
          emailExistsCacheRef.current.set(normalizedEmail, exists);
        }

        if (exists) {
          onModeChange("login");
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
    try {
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
            emailRedirectTo: buildAuthCallbackUrl(next, "redirect"),
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          writeSignupCooldown();
          completeSuccess();
          return;
        }

        writeSignupCooldown();
        showToast(toastMessages.accountCreated);
        onModeChange("login");
        setPassword("");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

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

  const openGooglePopup = async () => {
    if (!supabase) return false;

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildAuthCallbackUrl(next, "popup"),
        skipBrowserRedirect: true,
      },
    });

    if (oauthError) throw oauthError;

    const popupUrl = data?.url;
    if (!popupUrl) throw new Error("Google login could not start.");

    const popup = window.open(
      popupUrl,
      "tagloom_google_auth",
      centerPopup(520, 720),
    );

    if (!popup) {
      return false;
    }

    await new Promise<void>((resolve, reject) => {
      let finished = false;

      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        window.clearInterval(closePoll);
      };

      const finish = (fn: () => void) => {
        if (finished) return;
        finished = true;
        cleanup();
        fn();
      };

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        const payload = event.data as PopupMessage | null;
        if (!payload || payload.source !== AUTH_POPUP_MESSAGE_SOURCE) return;

        if (payload.type === "tagloom:auth-success") {
          finish(() => resolve());
          return;
        }

        finish(() =>
          reject(new Error(payload.message || "Google sign-in failed.")),
        );
      };

      const closePoll = window.setInterval(() => {
        if (!popup.closed) return;
        finish(() => reject(new Error("Google sign-in was canceled.")));
      }, 300);

      window.addEventListener("message", onMessage);
    });

    completeSuccess();
    return true;
  };

  const onGoogleAuth = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      if (!supabase) {
        showToast(toastMessages.authNotConfigured);
        return;
      }

      if (preferGooglePopup) {
        const popupSucceeded = await openGooglePopup();
        if (!popupSucceeded) {
          await fallbackGoogleRedirect();
        }
        return;
      }

      await fallbackGoogleRedirect();
    } catch (authError) {
      showAuthFailure(toastMessages.googleLoginFailed, authError);
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
      <div>
        <h2 className="mb-2 text-center text-2xl font-semibold text-stone-900">
          Enter your email to reset password
        </h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onResetPassword();
          }}
          className="space-y-4"
        >
          <div>
            <FieldLabel
              htmlFor="reset-email"
            >
              Email
            </FieldLabel>
            <TextInput
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
            {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}
          </div>
        </form>

        <div className="mt-5 flex flex-col items-center text-xs">
          <button
            type="button"
            onClick={() => {
              setView("auth");
              setError("");
            }}
            className="font-medium text-orange-600 hover:text-orange-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (view === "reset_password_sent") {
    return (
      <div>
        <p className="text-center text-sm font-semibold leading-relaxed text-stone-900 w-72 mx-auto">
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

  return (
    <div className={compact ? "space-y-4" : ""}>
      {showHeading ? (
        <>
          <h1 className="mb-2 text-2xl font-bold text-stone-900">{heading}</h1>
          <p className="mb-6 text-sm text-stone-500">{description}</p>
        </>
      ) : null}

      <form onSubmit={onEmailAuth} className="space-y-4">
        <button
          type="button"
          onClick={onGoogleAuth}
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

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-stone-200" />
          <span className="text-xs uppercase tracking-wide text-stone-400">
            or
          </span>
          <div className="h-px flex-1 bg-stone-200" />
        </div>

        {mode === "signup" ? (
          <TurnstileField ref={turnstileRef} onError={setError} />
        ) : null}

        <div>
          <FieldLabel
            htmlFor="email"
          >
            Email
          </FieldLabel>
          <TextInput
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </div>

        {mode === "login" || signupStep === "password" ? (
          <div>
            <FieldLabel
              htmlFor="password"
            >
              Password
            </FieldLabel>
            <TextInput
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isSubmitting || isCheckingEmail}
          isLoading={isCheckingEmail || isSubmitting}
          loadingLabel={isCheckingEmail ? "Checking account..." : "Submitting..."}
          className="w-full"
        >
          {submitLabel}
        </Button>
      </form>

      <div className="mt-2 text-center">
        {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}
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

        <p className="text-stone-600">
          {mode === "signup" ? "Already have an account?" : "No account?"}{" "}
          <button
            type="button"
            onClick={() => {
              onModeChange(mode === "signup" ? "login" : "signup");
              setError("");
            }}
            className="font-medium text-orange-600 hover:text-orange-700"
          >
            {mode === "signup" ? "Log in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}
