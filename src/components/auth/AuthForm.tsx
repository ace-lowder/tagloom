"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
  supportHref?: string;
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
  supportHref = "/support",
  showHeading = true,
  compact = false,
}: AuthFormProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupStep, setSignupStep] = useState<"email" | "password">(mode === "signup" ? "email" : "password");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
      setError("Auth is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    if (mode === "signup" && signupStep === "email") {
      if (!email.trim()) {
        setError("Enter your email first.");
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
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
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

        finish(() => reject(new Error(payload.message || "Google sign-in failed.")));
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
        throw new Error(
          "Auth is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
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
      setError(authError instanceof Error ? authError.message : "Google login failed.");
      setIsSubmitting(false);
    }
  };

  const submitLabel =
    mode === "signup"
      ? signupStep === "email"
        ? "Continue with email"
        : "Create account"
      : "Log in";

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
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-stone-200" />
          <span className="text-xs uppercase tracking-wide text-stone-400">or</span>
          <div className="h-px flex-1 bg-stone-200" />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">
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

        {(mode === "login" || signupStep === "password") ? (
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-700">
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
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}
        >
          {isSubmitting ? "Please wait..." : submitLabel}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mt-4 text-sm text-green-700">{notice}</p> : null}

      <p className="mt-5 text-sm text-stone-600">
        {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
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

      <p className="mt-3 text-xs text-stone-500">
        New accounts receive 1 free generation credit.{" "}
        <Link href={supportHref} className="text-orange-600 hover:text-orange-700">
          Need help?
        </Link>
      </p>
    </div>
  );
}
