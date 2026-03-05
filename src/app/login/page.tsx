"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [next, setNext] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextParam = params.get("next");
    if (nextParam && nextParam.startsWith("/")) {
      setNext(nextParam);
    }
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const supabase = createSupabaseBrowserClient();

  const onEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      if (!supabase) {
        throw new Error(
          "Auth is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
      }

      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });

        if (signUpError) throw signUpError;
        setNotice("Account created. Check your email to confirm your account.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        router.push(next);
        router.refresh();
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
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

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (oauthError) throw oauthError;
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Google login failed.");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-5 pb-12 pt-28">
      <div className="w-full rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600">Tagloom</p>
        <h1 className="mb-2 text-2xl font-bold text-stone-900">
          {isSignUp ? "Create your account" : "Log in"}
        </h1>
        <p className="mb-6 text-sm text-stone-500">
          {isSignUp
            ? "Use email and password to create your account."
            : "Sign in with email/password or continue with Google."}
        </p>

        <form onSubmit={onEmailAuth} className="space-y-4">
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}
          >
            {isSubmitting ? "Please wait..." : isSignUp ? "Create account" : "Log in"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-stone-200" />
          <span className="text-xs uppercase tracking-wide text-stone-400">or</span>
          <div className="h-px flex-1 bg-stone-200" />
        </div>

        <button
          type="button"
          onClick={onGoogleAuth}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue with Google
        </button>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="mt-4 text-sm text-green-700">{notice}</p> : null}

        <p className="mt-5 text-sm text-stone-600">
          {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp((value) => !value);
              setError("");
              setNotice("");
            }}
            className="font-medium text-orange-600 hover:text-orange-700"
          >
            {isSignUp ? "Log in" : "Create one"}
          </button>
        </p>

        <p className="mt-3 text-xs text-stone-500">
          By continuing, you agree to use Tagloom responsibly.{" "}
          <Link href="/support" className="text-orange-600 hover:text-orange-700">
            Need help?
          </Link>
        </p>
      </div>
    </main>
  );
}
