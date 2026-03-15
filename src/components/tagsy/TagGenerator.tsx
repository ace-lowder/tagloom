"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Sparkles } from "lucide-react";
import { useAuthController } from "@/components/auth/AuthController";
import { AUTH_SUCCESS_EVENT } from "@/lib/authModal";
import { GENERATOR_CTA_EVENT } from "@/lib/generatorCta";
import GradientBackground from "./GradientBackground";

type TagGeneratorProps = {
  onFocus?: () => void;
  glowRef?: RefObject<HTMLDivElement>;
  demoConfig?: {
    timings?: Partial<DemoTimings>;
    fixtures?: DemoFixture[];
  };
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

type DemoPhase = "typing" | "generating" | "revealing" | "clearing";
type ClearPhase = "idle" | "fading" | "collapsing";

type DemoFixture = {
  title: string;
  tags: {
    target: string[];
    discovery: string[];
  };
};

type DemoTimings = {
  typingStartDelayMs: number;
  typingCharMs: number;
  generatingDelayMs: number;
  generatingLoadMs: number;
  revealStepMs: number;
  revealTailMs: number;
  showDwellMs: number;
  clearFadeMs: number;
  clearCollapseMs: number;
  backspaceCharMs: number;
  cyclePauseMs: number;
};

type TimerMeta = {
  callback: (() => void) | null;
  delayMs: number;
  remainingMs: number;
  startedAtMs: number;
};

const DEMO_FIXTURES: DemoFixture[] = [
  {
    title: "Handmade ceramic coffee mug with minimalist design",
    tags: {
      target: [
        "ceramic mug",
        "handmade pottery",
        "minimalist cup",
        "coffee lover gift",
        "artisan mug",
        "stoneware cup",
        "modern ceramic",
      ],
      discovery: [
        "pottery gift",
        "hand thrown mug",
        "unique coffee mug",
        "kitchen gift",
        "home decor",
        "cozy gift",
      ],
    },
  },
  {
    title: "Vintage floral pressed flower bookmark set",
    tags: {
      target: [
        "pressed flower",
        "floral bookmark",
        "book lover gift",
        "botanical art",
        "dried flowers",
        "vintage bookmark",
        "gift for reader",
      ],
      discovery: [
        "handmade bookmark",
        "nature art",
        "wildflower print",
        "stocking stuffer",
        "teacher gift",
        "cottagecore",
      ],
    },
  },
  {
    title: "Custom engraved wooden cutting board for kitchen",
    tags: {
      target: [
        "custom cutting board",
        "engraved wood",
        "personalized gift",
        "wedding gift",
        "kitchen decor",
        "wooden board",
        "housewarming gift",
      ],
      discovery: [
        "custom kitchen",
        "laser engraved",
        "anniversary gift",
        "rustic kitchen",
        "foodie gift",
        "bamboo board",
      ],
    },
  },
];
const DEFAULT_DEMO_TIMINGS: DemoTimings = {
  typingStartDelayMs: 700,
  typingCharMs: 45,
  generatingDelayMs: 450,
  generatingLoadMs: 1500,
  revealStepMs: 80,
  revealTailMs: 300,
  showDwellMs: 3500,
  clearFadeMs: 160,
  clearCollapseMs: 240,
  backspaceCharMs: 9,
  cyclePauseMs: 500,
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

function sanitizeTags(tags: string[]) {
  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const rawTag of tags) {
    const tag = typeof rawTag === "string" ? rawTag.trim() : "";
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    cleaned.push(tag);
  }

  return cleaned;
}

function sanitizeMergedTags(target: string[], discovery: string[]) {
  return sanitizeTags([...target, ...discovery]);
}

export default function TagGenerator({ onFocus, glowRef, demoConfig }: TagGeneratorProps) {
  const { openAuthModal } = useAuthController();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);

  const [apiTags, setApiTags] = useState<string[]>([]);
  const [visibleTags, setVisibleTags] = useState<string[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"model" | "fallback" | null>(null);
  const [entitlementUsed, setEntitlementUsed] = useState<string | null>(null);
  const [paywall, setPaywall] = useState<PaywallState | null>(null);
  const [activeSheenId, setActiveSheenId] = useState<number | null>(null);
  const [generationContextId, setGenerationContextId] = useState<string | null>(null);
  const [isDemoActive, setIsDemoActive] = useState(true);
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("typing");
  const [clearPhase, setClearPhase] = useState<ClearPhase>("idle");
  const [shellHeightPx, setShellHeightPx] = useState<number | null>(null);
  const [shellHeightTransitionMs, setShellHeightTransitionMs] = useState(0);

  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseRafRef = useRef<number | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const requestVersionRef = useRef(0);
  const demoFixtureIndexRef = useRef(0);
  const demoCharIndexRef = useRef(0);
  const shouldSkipDemoRef = useRef(false);
  const isDemoPausedRef = useRef(false);
  const demoTimerMetaRef = useRef<TimerMeta>({
    callback: null,
    delayMs: 0,
    remainingMs: 0,
    startedAtMs: 0,
  });
  const revealTimerMetaRef = useRef<TimerMeta>({
    callback: null,
    delayMs: 0,
    remainingMs: 0,
    startedAtMs: 0,
  });

  const setRevealTimer = useCallback((callback: () => void, delayMs: number) => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    revealTimerMetaRef.current = {
      callback,
      delayMs,
      remainingMs: delayMs,
      startedAtMs: Date.now(),
    };
    revealTimeoutRef.current = setTimeout(() => {
      revealTimeoutRef.current = null;
      const cb = revealTimerMetaRef.current.callback;
      revealTimerMetaRef.current = { callback: null, delayMs: 0, remainingMs: 0, startedAtMs: 0 };
      if (cb) cb();
    }, delayMs);
  }, []);

  const pauseRevealTimer = useCallback(() => {
    if (!revealTimeoutRef.current || !revealTimerMetaRef.current.callback) return;
    clearTimeout(revealTimeoutRef.current);
    revealTimeoutRef.current = null;
    const elapsed = Date.now() - revealTimerMetaRef.current.startedAtMs;
    revealTimerMetaRef.current.remainingMs = Math.max(revealTimerMetaRef.current.delayMs - elapsed, 0);
  }, []);

  const resumeRevealTimer = useCallback(() => {
    if (revealTimeoutRef.current || !revealTimerMetaRef.current.callback) return;
    const delayMs = revealTimerMetaRef.current.remainingMs;
    revealTimerMetaRef.current.delayMs = delayMs;
    revealTimerMetaRef.current.startedAtMs = Date.now();
    revealTimeoutRef.current = setTimeout(() => {
      revealTimeoutRef.current = null;
      const cb = revealTimerMetaRef.current.callback;
      revealTimerMetaRef.current = { callback: null, delayMs: 0, remainingMs: 0, startedAtMs: 0 };
      if (cb) cb();
    }, delayMs);
  }, []);

  const clearRevealTimer = useCallback(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    revealTimerMetaRef.current = { callback: null, delayMs: 0, remainingMs: 0, startedAtMs: 0 };
  }, []);

  const setDemoTimer = useCallback((callback: () => void, delayMs: number) => {
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }
    demoTimerMetaRef.current = {
      callback,
      delayMs,
      remainingMs: delayMs,
      startedAtMs: Date.now(),
    };
    demoTimeoutRef.current = setTimeout(() => {
      demoTimeoutRef.current = null;
      const cb = demoTimerMetaRef.current.callback;
      demoTimerMetaRef.current = { callback: null, delayMs: 0, remainingMs: 0, startedAtMs: 0 };
      if (cb) cb();
    }, delayMs);
  }, []);

  const pauseDemoTimer = useCallback(() => {
    if (!demoTimeoutRef.current || !demoTimerMetaRef.current.callback) return;
    clearTimeout(demoTimeoutRef.current);
    demoTimeoutRef.current = null;
    const elapsed = Date.now() - demoTimerMetaRef.current.startedAtMs;
    demoTimerMetaRef.current.remainingMs = Math.max(demoTimerMetaRef.current.delayMs - elapsed, 0);
  }, []);

  const resumeDemoTimer = useCallback(() => {
    if (demoTimeoutRef.current || !demoTimerMetaRef.current.callback) return;
    const delayMs = demoTimerMetaRef.current.remainingMs;
    demoTimerMetaRef.current.delayMs = delayMs;
    demoTimerMetaRef.current.startedAtMs = Date.now();
    demoTimeoutRef.current = setTimeout(() => {
      demoTimeoutRef.current = null;
      const cb = demoTimerMetaRef.current.callback;
      demoTimerMetaRef.current = { callback: null, delayMs: 0, remainingMs: 0, startedAtMs: 0 };
      if (cb) cb();
    }, delayMs);
  }, []);

  const clearDemoTimer = useCallback(() => {
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }
    demoTimerMetaRef.current = { callback: null, delayMs: 0, remainingMs: 0, startedAtMs: 0 };
    if (collapseRafRef.current) {
      cancelAnimationFrame(collapseRafRef.current);
      collapseRafRef.current = null;
    }
  }, []);

  const markUserInteraction = useCallback(() => {
    if (!isDemoActive) return;
    isDemoPausedRef.current = false;
    setIsDemoActive(false);
    clearDemoTimer();
    clearRevealTimer();
    setDemoPhase("typing");
    setClearPhase("idle");
    setShellHeightTransitionMs(0);
    setShellHeightPx(null);
    setApiTags([]);
    setVisibleTags([]);
    setIsGenerating(false);
  }, [clearDemoTimer, clearRevealTimer, isDemoActive]);

  const playSheen = useCallback(() => {
    setActiveSheenId(Date.now());
  }, []);

  const focusTitleInput = useCallback(() => {
    window.setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 20);
  }, []);

  const demoFixtures = useMemo(() => demoConfig?.fixtures ?? DEMO_FIXTURES, [demoConfig?.fixtures]);
  const demoTimings = useMemo<DemoTimings>(
    () => ({
      ...DEFAULT_DEMO_TIMINGS,
      ...(demoConfig?.timings ?? {}),
    }),
    [demoConfig?.timings],
  );

  const animateApiTagsIn = useCallback(
    (tags: string[], requestVersion: number) => {
      clearRevealTimer();
      setVisibleTags([]);

      let tagIndex = 0;

      const revealNext = () => {
        if (requestVersionRef.current !== requestVersion) return;

        if (tagIndex < tags.length) {
          const nextTag = tags[tagIndex];
          tagIndex += 1;
          setVisibleTags((prev) => [...prev, nextTag]);
          setRevealTimer(revealNext, demoTimings.revealStepMs);
        }
      };

      setRevealTimer(revealNext, demoTimings.revealStepMs);
    },
    [clearRevealTimer, demoTimings.revealStepMs, setRevealTimer],
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
      const cleanTags = sanitizeMergedTags(target, discovery);
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;

      setApiTags(cleanTags);
      animateApiTagsIn(cleanTags, requestVersion);
    },
    [animateApiTagsIn],
  );

  useEffect(() => {
    if (!isDemoActive || shouldSkipDemoRef.current) return;

    clearDemoTimer();
    clearRevealTimer();
    const resetDemoVisualState = () => {
      setDemoPhase("typing");
      setError("");
      setPaywall(null);
      setSource(null);
      setEntitlementUsed(null);
      setDescription("");
      setApiTags([]);
      setVisibleTags([]);
      setClearPhase("idle");
      setIsGenerating(false);
      setCopied(false);
    };

    const runCycle = () => {
      if (!isDemoActive || shouldSkipDemoRef.current) return;

      const fixture = demoFixtures[demoFixtureIndexRef.current % demoFixtures.length];
      resetDemoVisualState();
      demoCharIndexRef.current = 0;
      setTitle("");

      const runTyping = () => {
        if (!isDemoActive || shouldSkipDemoRef.current) return;
        demoCharIndexRef.current += 1;
        setTitle(fixture.title.slice(0, demoCharIndexRef.current));
        if (demoCharIndexRef.current < fixture.title.length) {
          setDemoTimer(runTyping, demoTimings.typingCharMs);
          return;
        }

        setDemoTimer(() => {
          if (!isDemoActive || shouldSkipDemoRef.current) return;
          setDemoPhase("generating");
          setIsGenerating(true);

          setDemoTimer(() => {
            if (!isDemoActive || shouldSkipDemoRef.current) return;
            setIsGenerating(false);
            setDemoPhase("revealing");
            setResultTags(fixture.tags.target, fixture.tags.discovery);

            const revealTagCount = sanitizeMergedTags(fixture.tags.target, fixture.tags.discovery).length;
            const revealDuration =
              revealTagCount * demoTimings.revealStepMs +
              demoTimings.revealTailMs +
              demoTimings.showDwellMs;
            setDemoTimer(() => {
              if (!isDemoActive || shouldSkipDemoRef.current) return;
              setDemoPhase("clearing");
              setClearPhase("fading");

              let titleLength = fixture.title.length;
              const runBackspace = () => {
                if (!isDemoActive || shouldSkipDemoRef.current) return;
                if (titleLength <= 0) {
                  demoFixtureIndexRef.current += 1;
                  setDemoTimer(runCycle, demoTimings.cyclePauseMs);
                  return;
                }

                titleLength -= 1;
                setTitle(fixture.title.slice(0, titleLength));
                setDemoTimer(runBackspace, demoTimings.backspaceCharMs);
              };

              setDemoTimer(() => {
                if (!isDemoActive || shouldSkipDemoRef.current) return;
                const shell = shellRef.current;
                const fromHeight = shell?.getBoundingClientRect().height ?? null;
                if (fromHeight !== null) {
                  setShellHeightTransitionMs(0);
                  setShellHeightPx(fromHeight);
                }
                setVisibleTags([]);
                setApiTags([]);
                setClearPhase("collapsing");

                collapseRafRef.current = requestAnimationFrame(() => {
                  collapseRafRef.current = null;
                  if (!isDemoActive || shouldSkipDemoRef.current) return;
                  const contentHeight = contentRef.current?.getBoundingClientRect().height ?? null;
                  const toHeight = contentHeight !== null ? Math.max(contentHeight + 2, 0) : fromHeight;
                  if (fromHeight !== null && toHeight !== undefined) {
                    setShellHeightTransitionMs(demoTimings.clearCollapseMs);
                    setShellHeightPx(toHeight);
                  }

                  setDemoTimer(() => {
                    if (!isDemoActive || shouldSkipDemoRef.current) return;
                    setShellHeightTransitionMs(0);
                    setShellHeightPx(null);
                    setClearPhase("idle");
                    runBackspace();
                  }, demoTimings.clearCollapseMs);
                });
              }, demoTimings.clearFadeMs);
            }, revealDuration);
          }, demoTimings.generatingLoadMs);
        }, demoTimings.generatingDelayMs);
      };

      setDemoTimer(runTyping, demoTimings.typingStartDelayMs);
    };

    runCycle();

    return clearDemoTimer;
  }, [clearDemoTimer, clearRevealTimer, demoFixtures, demoTimings, isDemoActive, setDemoTimer, setResultTags]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (!isDemoActive || shouldSkipDemoRef.current) return;
        isDemoPausedRef.current = true;
        pauseDemoTimer();
        pauseRevealTimer();
        if (clearPhase === "collapsing") {
          setShellHeightTransitionMs(0);
          setShellHeightPx(null);
          setClearPhase("idle");
        }
      } else if (isDemoPausedRef.current && isDemoActive && !shouldSkipDemoRef.current) {
        isDemoPausedRef.current = false;
        resumeRevealTimer();
        resumeDemoTimer();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [clearPhase, isDemoActive, pauseDemoTimer, pauseRevealTimer, resumeDemoTimer, resumeRevealTimer]);

  useEffect(() => {
    if (!isDemoActive || shouldSkipDemoRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    const node = shellRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          if (!isDemoPausedRef.current) return;
          isDemoPausedRef.current = false;
          resumeRevealTimer();
          resumeDemoTimer();
          return;
        }

        if (isDemoPausedRef.current) return;
        isDemoPausedRef.current = true;
        pauseDemoTimer();
        pauseRevealTimer();
      },
      { threshold: 0.15 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isDemoActive, pauseDemoTimer, pauseRevealTimer, resumeDemoTimer, resumeRevealTimer]);

  useEffect(() => clearDemoTimer, [clearDemoTimer]);

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
    markUserInteraction();
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
    setApiTags([]);
    setVisibleTags([]);
    setClearPhase("idle");
    setShellHeightTransitionMs(0);
    setShellHeightPx(null);

    try {
      await runGeneration(title, description, contextId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  }, [clearRevealTimer, description, generationContextId, markUserInteraction, runGeneration, title]);

  const goToLogin = () => {
    markUserInteraction();
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
    markUserInteraction();
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
    shouldSkipDemoRef.current = true;
    setIsDemoActive(false);
    clearDemoTimer();
    clearRevealTimer();

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
  }, [clearDemoTimer, clearRevealTimer, runGeneration]);

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
    markUserInteraction();
    const allTags = visibleTags;

    if (!allTags.length || paywall) return;

    await navigator.clipboard.writeText(allTags.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalTags = visibleTags.length;
  const showResults = totalTags > 0;
  const isClearingFade = clearPhase === "fading";
  const hasTitle = Boolean(title.trim());

  return (
    <div ref={glowRef} id="generator" className="relative mx-auto max-w-2xl">
      <div className="pointer-events-none absolute -inset-8 overflow-hidden rounded-3xl">
        <GradientBackground />
      </div>

      <motion.div
        ref={shellRef}
        data-testid="generator-shell"
        data-clear-phase={clearPhase}
        data-height-locked={shellHeightPx !== null ? "true" : "false"}
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
          height: shellHeightPx ?? undefined,
          transition: shellHeightPx !== null ? `height ${shellHeightTransitionMs}ms ease-out` : undefined,
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

        <div ref={contentRef} className="relative z-10 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
              <Sparkles className="h-3.5 w-3.5 text-white" />
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
                markUserInteraction();
                setShowDescription(true);
                if (onFocus) onFocus();
              }}
              onChange={(e) => {
                markUserInteraction();
                setTitle(e.target.value);
              }}
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
                  onChange={(e) => {
                    markUserInteraction();
                    setDescription(e.target.value);
                  }}
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
            className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
              hasTitle
                ? "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                : "bg-gray-300"
            }`}
            style={{
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
                Generate 13 Tags
              </>
            )}
          </button>

          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
          {entitlementUsed ? (
            <p className="mt-2 text-xs text-stone-500">Unlocked with: {entitlementUsed.replace("_", " ")}</p>
          ) : null}

          <AnimatePresence>
            {showResults && (
              <motion.div
                data-testid="results-block"
                initial={{ opacity: 0, y: 8 }}
                animate={isClearingFade ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
                transition={{ duration: isClearingFade ? 0.16 : 0.22, ease: "easeOut" }}
                className="mt-6"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span data-testid="generated-tag-count" className="text-sm font-medium text-stone-700">
                    {totalTags} tags generated
                  </span>
                  <button
                    onClick={handleCopyAll}
                    disabled={Boolean(paywall)}
                    className="flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 transition-all hover:bg-orange-100 hover:text-orange-700 disabled:opacity-50"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied!" : "Copy All"}
                  </button>
                </div>

                <div className={`flex flex-wrap gap-2 ${paywall ? "blur-sm select-none" : ""}`}>
                  {visibleTags.map((tag, i) => (
                    <motion.span
                      key={`${tag}-${i}`}
                      data-testid="generated-tag-chip"
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

        </div>
      </motion.div>
    </div>
  );
}
