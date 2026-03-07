"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Sparkles } from "lucide-react";
import { useAuthController } from "@/components/auth/AuthController";
import { AUTH_SUCCESS_EVENT } from "@/lib/authModal";
import { GENERATOR_CTA_EVENT } from "@/lib/generatorCta";
import GradientBackground from "./GradientBackground";

type TagGeneratorProps = {
  onFocus?: () => void;
  glowRef?: RefObject<HTMLDivElement>;
};

type GenerateOkResponse = {
  status: "ok";
  requestId: string | null;
  tags: {
    target: string[];
    discovery: string[];
  };
  source: "model" | "fallback";
  entitlementUsed:
    | "free_credit"
    | "single_use"
    | "subscription_monthly"
    | "subscription_yearly";
};

type GeneratePaywallResponse = {
  status: "paywall";
  reason: "auth_required" | "payment_required" | "limit_reached";
  requestId: string | null;
  message: string;
  placeholders: {
    target: string[];
    discovery: string[];
  };
};

type GenerateResponse = GenerateOkResponse | GeneratePaywallResponse;

type PaywallState = {
  reason: "auth_required" | "payment_required" | "limit_reached";
  message: string;
  requestId: string | null;
};

type PendingContext = {
  id: string;
  title: string;
  description: string;
};

const CONTEXT_STORAGE_PREFIX = "tagloom:genctx:";

function getContextStorageKey(id: string) {
  return `${CONTEXT_STORAGE_PREFIX}${id}`;
}

function generateContextId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function savePendingContext(context: PendingContext) {
  sessionStorage.setItem(getContextStorageKey(context.id), JSON.stringify(context));
}

function loadPendingContext(id: string): PendingContext | null {
  const raw = sessionStorage.getItem(getContextStorageKey(id));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingContext;
    if (!parsed?.id || !parsed?.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearPendingContext(id: string) {
  sessionStorage.removeItem(getContextStorageKey(id));
}

export default function TagGenerator({ onFocus, glowRef }: TagGeneratorProps) {
  const { openAuthModal } = useAuthController();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);

  const [apiTargetTags, setApiTargetTags] = useState<string[]>([]);
  const [apiDiscoveryTags, setApiDiscoveryTags] = useState<string[]>([]);
  const [visibleTargetTags, setVisibleTargetTags] = useState<string[]>([]);
  const [visibleDiscoveryTags, setVisibleDiscoveryTags] = useState<string[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"model" | "fallback" | null>(null);
  const [entitlementUsed, setEntitlementUsed] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<PaywallState | null>(null);
  const [activeSheenId, setActiveSheenId] = useState<number | null>(null);
  const [generationContextId, setGenerationContextId] = useState<string | null>(null);

  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const requestVersionRef = useRef(0);

  const clearRevealTimer = useCallback(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
  }, []);

  const playSheen = useCallback(() => {
    setActiveSheenId(Date.now());
  }, []);

  const focusTitleInput = useCallback(() => {
    window.setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 20);
  }, []);

  const animateApiTagsIn = useCallback(
    (target: string[], discovery: string[], requestVersion: number) => {
      clearRevealTimer();
      setVisibleTargetTags([]);
      setVisibleDiscoveryTags([]);

      let targetIndex = 0;
      let discoveryIndex = 0;

      const revealNext = () => {
        if (requestVersionRef.current !== requestVersion) return;

        if (targetIndex < target.length) {
          setVisibleTargetTags((prev) => [...prev, target[targetIndex]]);
          targetIndex += 1;
          revealTimeoutRef.current = setTimeout(revealNext, 80);
          return;
        }

        if (discoveryIndex < discovery.length) {
          setVisibleDiscoveryTags((prev) => [...prev, discovery[discoveryIndex]]);
          discoveryIndex += 1;
          revealTimeoutRef.current = setTimeout(revealNext, 80);
        }
      };

      revealTimeoutRef.current = setTimeout(revealNext, 80);
    },
    [clearRevealTimer],
  );

  useEffect(() => {
    const onCta = () => {
      setShowDescription(true);
      focusTitleInput();
      playSheen();
    };

    window.addEventListener(GENERATOR_CTA_EVENT, onCta as EventListener);
    return () => window.removeEventListener(GENERATOR_CTA_EVENT, onCta as EventListener);
  }, [focusTitleInput, playSheen]);

  useEffect(() => {
    return () => {
      clearRevealTimer();
    };
  }, [clearRevealTimer]);

  const setResultTags = useCallback(
    (target: string[], discovery: string[]) => {
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;

      setApiTargetTags(target);
      setApiDiscoveryTags(discovery);
      animateApiTagsIn(target, discovery, requestVersion);
    },
    [animateApiTagsIn],
  );

  const runGeneration = useCallback(
    async (inputTitle: string, inputDescription: string, contextId: string) => {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: inputTitle,
          description: inputDescription,
          generationContextId: contextId,
        }),
      });

      const data = (await response.json()) as GenerateResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Could not generate tags.");
      }

      if (data.status === "paywall") {
        setPaywall({
          reason: data.reason,
          message: data.message,
          requestId: data.requestId,
        });
        setSource(null);
        setEntitlementUsed(null);
        setResultTags(data.placeholders.target, data.placeholders.discovery);
        return;
      }

      setPaywall(null);
      setSource(data.source);
      setEntitlementUsed(data.entitlementUsed);
      setResultTags(data.tags.target, data.tags.discovery);

      clearPendingContext(contextId);

      const url = new URL(window.location.href);
      if (url.searchParams.has("gen_ctx") || url.searchParams.has("checkout")) {
        url.searchParams.delete("gen_ctx");
        url.searchParams.delete("checkout");
        window.history.replaceState({}, "", url.toString());
      }
    },
    [setResultTags],
  );

  const handleGenerate = useCallback(async () => {
    if (!title.trim()) return;

    const contextId = generationContextId || generateContextId();
    setGenerationContextId(contextId);

    savePendingContext({
      id: contextId,
      title,
      description,
    });

    clearRevealTimer();
    setError("");
    setIsGenerating(true);
    setSource(null);
    setEntitlementUsed(null);
    setPaywall(null);
    setApiTargetTags([]);
    setApiDiscoveryTags([]);
    setVisibleTargetTags([]);
    setVisibleDiscoveryTags([]);

    try {
      await runGeneration(title, description, contextId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  }, [clearRevealTimer, description, generationContextId, runGeneration, title]);

  const goToLogin = () => {
    if (!title.trim()) {
      setError("Enter a listing title first.");
      return;
    }

    const contextId = generationContextId || generateContextId();
    setGenerationContextId(contextId);

    savePendingContext({
      id: contextId,
      title,
      description,
    });

    openAuthModal({
      mode: "login",
      source: "generator_paywall",
      next: `/?gen_ctx=${encodeURIComponent(contextId)}`,
    });
  };

  const startCheckout = async (purchaseType: "single_use" | "monthly" | "yearly") => {
    if (!generationContextId) {
      setError("Could not start checkout. Please try generating again.");
      return;
    }

    setIsCheckingOut(true);
    setError("");

    try {
      const response = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseType,
          generationContextId,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Could not create checkout session.");
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout failed.");
      setIsCheckingOut(false);
    }
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const contextId = url.searchParams.get("gen_ctx");

    if (!contextId) return;

    const context = loadPendingContext(contextId);
    if (!context) return;

    setGenerationContextId(context.id);
    setTitle(context.title);
    setDescription(context.description);
    setShowDescription(Boolean(context.description));

    const shouldResume =
      url.searchParams.get("checkout") === "success" ||
      url.searchParams.get("checkout") === "cancel" ||
      true;

    if (!shouldResume) return;

    window.setTimeout(() => {
      runGeneration(context.title, context.description, context.id).catch((err) => {
        setError(err instanceof Error ? err.message : "Could not resume generation.");
      });
    }, 120);
  }, [runGeneration]);

  useEffect(() => {
    const onAuthSuccess = () => {
      if (!paywall || paywall.reason !== "auth_required") return;
      if (!generationContextId) return;

      const context = loadPendingContext(generationContextId);
      if (!context) return;

      setError("");
      setPaywall(null);
      runGeneration(context.title, context.description, context.id).catch((err) => {
        setError(err instanceof Error ? err.message : "Could not resume generation.");
      });
    };

    window.addEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
    return () => window.removeEventListener(AUTH_SUCCESS_EVENT, onAuthSuccess);
  }, [generationContextId, paywall, runGeneration]);

  const handleCopyAll = async () => {
    const allTags = [...visibleTargetTags, ...visibleDiscoveryTags];

    if (!allTags.length || paywall) return;

    await navigator.clipboard.writeText(allTags.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalTags = visibleTargetTags.length + visibleDiscoveryTags.length;

  return (
    <div ref={glowRef} id="generator" className="relative mx-auto max-w-2xl">
      <div className="pointer-events-none absolute -inset-8 overflow-hidden rounded-3xl">
        <GradientBackground />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.8)",
          backdropFilter: "blur(30px)",
          WebkitBackdropFilter: "blur(30px)",
          border: "1px solid rgba(255,255,255,0.92)",
          boxShadow:
            "0 24px 84px rgba(249,115,22,0.24), 0 12px 52px rgba(168,85,247,0.18), 0 1px 0 rgba(255,255,255,0.92) inset",
        }}
      >
        {activeSheenId ? (
          <motion.div
            key={activeSheenId}
            initial={{ x: "-120%", opacity: 0 }}
            animate={{ x: "170%", opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.95, ease: "easeInOut" }}
            onAnimationComplete={() => setActiveSheenId(null)}
            className="pointer-events-none absolute inset-y-0 left-0 z-20 w-2/5 -skew-x-12"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.78) 45%, rgba(255,255,255,0) 100%)",
            }}
          />
        ) : null}

        <div className="relative z-10 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-stone-700">Tagloom Generator</span>
            {source ? <span className="ml-auto text-xs italic text-stone-400">Source: {source}</span> : null}
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Listing Title <span className="text-orange-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onFocus={() => {
                setShowDescription(true);
                if (onFocus) onFocus();
              }}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Handmade ceramic coffee mug with minimalist design"
              className="w-full rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
            />
          </div>

          <AnimatePresence>
            {showDescription && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-3 overflow-hidden"
              >
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Listing Description <span className="font-normal text-stone-400">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add more details about your product to get more accurate tags..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !title.trim()}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: title.trim()
                ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                : "#d1d5db",
              boxShadow: title.trim() ? "0 4px 20px rgba(249,115,22,0.35)" : "none",
            }}
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
                />
                Generating tags...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Tags
              </>
            )}
          </button>

          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          {entitlementUsed ? (
            <p className="mt-2 text-xs text-stone-500">Unlocked with: {entitlementUsed.replace("_", " ")}</p>
          ) : null}

          <AnimatePresence>
            {totalTags > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-700">{totalTags} tags generated</span>
                  <button
                    onClick={handleCopyAll}
                    disabled={Boolean(paywall)}
                    className="flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 transition-all hover:bg-orange-100 hover:text-orange-700 disabled:opacity-50"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy All"}
                  </button>
                </div>

                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Target tags</p>
                <div className={`mb-4 flex flex-wrap gap-2 ${paywall ? "blur-sm select-none" : ""}`}>
                  {visibleTargetTags.map((tag, i) => (
                    <motion.span
                      key={`${tag}-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 20 }}
                      className="cursor-default rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm"
                    >
                      {tag}
                    </motion.span>
                  ))}
                </div>

                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Discovery tags</p>
                <div className={`flex flex-wrap gap-2 ${paywall ? "blur-sm select-none" : ""}`}>
                  {visibleDiscoveryTags.map((tag, i) => (
                    <motion.span
                      key={`${tag}-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 20 }}
                      className="cursor-default rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm"
                    >
                      {tag}
                    </motion.span>
                  ))}
                </div>

                {paywall ? (
                  <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-sm font-medium text-orange-800">{paywall.message}</p>
                    <p className="mt-1 text-xs text-orange-700">
                      Log in to unlock this exact generation. New accounts get 1 free generation.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={goToLogin}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-orange-700 ring-1 ring-orange-300"
                      >
                        Create account / Log in
                      </button>
                      <button
                        type="button"
                        onClick={() => startCheckout("single_use")}
                        disabled={isCheckingOut || paywall.reason === "auth_required"}
                        className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {isCheckingOut ? "Loading..." : "Buy single use"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startCheckout("monthly")}
                        disabled={isCheckingOut || paywall.reason === "auth_required"}
                        className="rounded-lg bg-stone-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Monthly (100/mo)
                      </button>
                      <button
                        type="button"
                        onClick={() => startCheckout("yearly")}
                        disabled={isCheckingOut || paywall.reason === "auth_required"}
                        className="rounded-lg bg-stone-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Yearly (unlimited)
                      </button>
                    </div>
                    {paywall.reason === "auth_required" ? (
                      <p className="mt-2 text-xs text-orange-700">
                        Purchase options unlock after login so we can attach payment to your account.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {apiTargetTags.length !== visibleTargetTags.length || apiDiscoveryTags.length !== visibleDiscoveryTags.length ? (
            <p className="mt-2 text-xs text-stone-500">Animating results...</p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
