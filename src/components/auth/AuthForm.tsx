"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AUTH_POPUP_MESSAGE_SOURCE } from "@/lib/authModal";
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

function buildCallbackUrl(next: string, flow: "popup" | "redirect") {
  const params = new URLSearchParams({
    next,
    flow,
  });
  return `${window.location.origin}/auth/callback?${params.toString()}`;
}

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [view, setView] = useState<
    "auth" | "reset_password" | "reset_password_sent"
  >("auth");
  const [signupStep, setSignupStep] = useState<"email" | "password">(
    mode === "signup" ? "email" : "password",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signupEmailCheckStatus, setSignupEmailCheckStatus] = useState<
    "idle" | "checking" | "exists" | "available" | "error"
  >("idle");

  const emailExistsCacheRef = useRef<Map<string, boolean>>(new Map());
  const signupCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const signupCheckRequestRef = useRef(0);

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

  const description = useMemo(() => {
    if (mode === "signup") {
      return "Create an account to unlock your first free generation.";
    }
    return "Sign in with email/password or continue with Google.";
  }, [mode]);

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const emailIsValid = useMemo(() => isValidEmail(normalizedEmail), [normalizedEmail]);

  useEffect(() => {
    return () => {
      if (signupCheckTimeoutRef.current) {
        clearTimeout(signupCheckTimeoutRef.current);
        signupCheckTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (
      view !== "auth" ||
      mode !== "signup" ||
      signupStep !== "email" ||
      !emailIsValid
    ) {
      setSignupEmailCheckStatus("idle");
      if (signupCheckTimeoutRef.current) {
        clearTimeout(signupCheckTimeoutRef.current);
        signupCheckTimeoutRef.current = null;
      }
      return;
    }

    const cached = emailExistsCacheRef.current.get(normalizedEmail);
    if (typeof cached === "boolean") {
      setSignupEmailCheckStatus(cached ? "exists" : "available");
      return;
    }

    setSignupEmailCheckStatus("checking");
    if (signupCheckTimeoutRef.current) {
      clearTimeout(signupCheckTimeoutRef.current);
      signupCheckTimeoutRef.current = null;
    }

    const requestId = signupCheckRequestRef.current + 1;
    signupCheckRequestRef.current = requestId;

    signupCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const exists = await checkEmailExists(normalizedEmail);
        emailExistsCacheRef.current.set(normalizedEmail, exists);
        if (signupCheckRequestRef.current !== requestId) return;
        setSignupEmailCheckStatus(exists ? "exists" : "available");
      } catch {
        if (signupCheckRequestRef.current !== requestId) return;
        setSignupEmailCheckStatus("error");
      }
    }, 220);
  }, [view, mode, signupStep, normalizedEmail, emailIsValid]);

  const completeSuccess = () => {
    if (onAuthSuccess) {
      onAuthSuccess();
      return;
    }

    router.push(next);
    router.refresh();
  };

  const onEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!supabase) {
      setError("Auth is not configured.");
      return;
    }

    if (mode === "signup" && signupStep === "email") {
      if (!emailIsValid) {
        setError("Enter a valid email first.");
        return;
      }

      const cached = emailExistsCacheRef.current.get(normalizedEmail);
      if (typeof cached === "boolean") {
        if (cached) {
          onModeChange("login");
          setNotice("");
          return;
        }
        setSignupStep("password");
        return;
      }

      if (signupEmailCheckStatus === "exists") {
        onModeChange("login");
        setNotice("");
        return;
      }
      if (signupEmailCheckStatus === "available") {
        setSignupStep("password");
        return;
      }

      try {
        const exists = await checkEmailExists(normalizedEmail);
        emailExistsCacheRef.current.set(normalizedEmail, exists);
        if (exists) {
          onModeChange("login");
          setNotice("");
          return;
        }
      } catch (checkError) {
        console.error("/api/auth/email-exists lookup failed", checkError);
        return;
      }
      setSignupStep("password");
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: buildCallbackUrl(next, "redirect"),
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          completeSuccess();
          return;
        }

        setNotice("Account created. Check your email to confirm your account.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      completeSuccess();
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Authentication failed.",
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
        redirectTo: buildCallbackUrl(next, "redirect"),
      },
    });

    if (oauthError) throw oauthError;
  };

  const openGooglePopup = async () => {
    if (!supabase) return false;

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildCallbackUrl(next, "popup"),
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
    setNotice("");
    setIsSubmitting(true);

    try {
      if (!supabase) {
        throw new Error("Auth is not configured.");
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
      setError(
        authError instanceof Error ? authError.message : "Google login failed.",
      );
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
    setNotice("");
    setIsSubmitting(true);

    try {
      if (!supabase) {
        throw new Error("Auth is not configured.");
      }

      if (!emailIsValid) {
        throw new Error("Enter a valid email first.");
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/login`,
        },
      );

      if (resetError) throw resetError;
      setView("reset_password_sent");
      setNotice("");
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Could not reset password.",
      );
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
            <label
              htmlFor="reset-email"
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !emailIsValid}
            className="w-full rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Please wait..." : "Reset password"}
          </button>

          <div className="text-center">
            {error ? <p className="text-xs text-red-700">{error}</p> : null}
            {notice ? <p className="text-xs text-green-700">{notice}</p> : null}
          </div>
        </form>

        <div className="mt-5 flex flex-col items-center text-xs">
          <button
            type="button"
            onClick={() => {
              setView("auth");
              setError("");
              setNotice("");
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
          {" " + email.trim() || "your email"}, you will get an email with
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
              setNotice("");
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

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-stone-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            placeholder="you@example.com"
          />
        </div>

        {mode === "login" || signupStep === "password" ? (
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-stone-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
              placeholder="At least 6 characters"
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Please wait..." : submitLabel}
        </button>
      </form>

      <div className="mt-2 text-center">
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
        {notice ? <p className="text-xs text-green-700">{notice}</p> : null}
      </div>

      <div className="mt-5 flex flex-col items-center gap-3 text-xs">
        {mode === "login" ? (
          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
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
              setNotice("");
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
