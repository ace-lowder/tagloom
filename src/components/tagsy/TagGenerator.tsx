"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Sparkles } from "lucide-react";
import GradientBackground from "./GradientBackground";

type TagApiResponse = {
  tags: {
    target: string[];
    discovery: string[];
  };
  source: "model" | "fallback";
  error?: string;
};

type TagGeneratorProps = {
  onFocus?: () => void;
  glowRef?: RefObject<HTMLDivElement>;
};

type DemoPhase = "idle" | "typing" | "generating" | "revealing";

type DemoProduct = {
  title: string;
  tags: string[];
};

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    title: "Handmade ceramic coffee mug with minimalist design",
    tags: [
      "ceramic mug",
      "handmade pottery",
      "minimalist cup",
      "coffee lover gift",
      "artisan mug",
      "stoneware cup",
      "modern ceramic",
      "pottery gift",
      "hand thrown mug",
      "unique coffee mug",
      "kitchen gift",
      "home decor",
      "cozy gift",
    ],
  },
  {
    title: "Vintage floral pressed flower bookmark set",
    tags: [
      "pressed flower",
      "floral bookmark",
      "book lover gift",
      "botanical art",
      "dried flowers",
      "vintage bookmark",
      "gift for reader",
      "handmade bookmark",
      "nature art",
      "wildflower print",
      "stocking stuffer",
      "teacher gift",
      "cottagecore",
    ],
  },
  {
    title: "Custom engraved wooden cutting board for kitchen",
    tags: [
      "custom cutting board",
      "engraved wood",
      "personalized gift",
      "wedding gift",
      "kitchen decor",
      "wooden board",
      "housewarming gift",
      "custom kitchen",
      "laser engraved",
      "anniversary gift",
      "rustic kitchen",
      "foodie gift",
      "bamboo board",
    ],
  },
];

export default function TagGenerator({ onFocus, glowRef }: TagGeneratorProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);

  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("idle");
  const [demoTitle, setDemoTitle] = useState("");
  const [demoTags, setDemoTags] = useState<string[]>([]);

  const [apiTargetTags, setApiTargetTags] = useState<string[]>([]);
  const [apiDiscoveryTags, setApiDiscoveryTags] = useState<string[]>([]);
  const [visibleTargetTags, setVisibleTargetTags] = useState<string[]>([]);
  const [visibleDiscoveryTags, setVisibleDiscoveryTags] = useState<string[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"model" | "fallback" | null>(null);

  const demoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoIndexRef = useRef(0);
  const hasUserInteractedRef = useRef(false);
  const requestVersionRef = useRef(0);

  const clearDemoTimer = useCallback(() => {
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }
  }, []);

  const clearRevealTimer = useCallback(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
  }, []);

  const commitUserInteraction = useCallback(() => {
    if (hasUserInteractedRef.current) return;

    hasUserInteractedRef.current = true;
    setHasUserInteracted(true);
    setDemoPhase("idle");
    setDemoTitle("");
    setDemoTags([]);
    clearDemoTimer();
  }, [clearDemoTimer]);

  const runDemoCycle = useCallback(() => {
    if (hasUserInteractedRef.current) return;

    clearDemoTimer();
    const product = DEMO_PRODUCTS[demoIndexRef.current % DEMO_PRODUCTS.length];

    setDemoTags([]);
    setDemoTitle("");
    setDemoPhase("typing");

    let charIndex = 0;

    const typeNextChar = () => {
      if (hasUserInteractedRef.current) return;

      if (charIndex <= product.title.length) {
        setDemoTitle(product.title.slice(0, charIndex));
        charIndex += 1;
        demoTimeoutRef.current = setTimeout(typeNextChar, 45);
        return;
      }

      setDemoPhase("generating");
      demoTimeoutRef.current = setTimeout(() => {
        if (hasUserInteractedRef.current) return;

        setDemoPhase("revealing");
        let tagIndex = 0;

        const revealNextTag = () => {
          if (hasUserInteractedRef.current) return;

          if (tagIndex < product.tags.length) {
            setDemoTags((prev) => [...prev, product.tags[tagIndex]]);
            tagIndex += 1;
            demoTimeoutRef.current = setTimeout(revealNextTag, 120);
            return;
          }

          demoTimeoutRef.current = setTimeout(() => {
            if (hasUserInteractedRef.current) return;
            demoIndexRef.current += 1;
            runDemoCycle();
          }, 2200);
        };

        revealNextTag();
      }, 900);
    };

    typeNextChar();
  }, [clearDemoTimer]);

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
    if (hasUserInteracted) return;

    clearDemoTimer();
    demoTimeoutRef.current = setTimeout(() => {
      if (!hasUserInteractedRef.current) runDemoCycle();
    }, 1000);

    return () => {
      clearDemoTimer();
    };
  }, [hasUserInteracted, runDemoCycle, clearDemoTimer]);

  useEffect(() => {
    return () => {
      clearDemoTimer();
      clearRevealTimer();
    };
  }, [clearDemoTimer, clearRevealTimer]);

  const handleTitleFocus = () => {
    commitUserInteraction();
    setShowDescription(true);
    if (onFocus) onFocus();
  };

  const handleGenerate = async () => {
    commitUserInteraction();
    if (!title.trim()) return;

    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;

    clearRevealTimer();
    setError("");
    setIsGenerating(true);
    setSource(null);
    setApiTargetTags([]);
    setApiDiscoveryTags([]);
    setVisibleTargetTags([]);
    setVisibleDiscoveryTags([]);

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      const data = (await response.json()) as TagApiResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not generate tags.");
      }

      if (requestVersionRef.current !== requestVersion) return;

      const nextTarget = data.tags?.target || [];
      const nextDiscovery = data.tags?.discovery || [];

      setApiTargetTags(nextTarget);
      setApiDiscoveryTags(nextDiscovery);
      setSource(data.source || null);
      animateApiTagsIn(nextTarget, nextDiscovery, requestVersion);
    } catch (err) {
      if (requestVersionRef.current !== requestVersion) return;
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      if (requestVersionRef.current === requestVersion) {
        setIsGenerating(false);
      }
    }
  };

  const handleCopyAll = async () => {
    const allTags = hasUserInteracted
      ? [...visibleTargetTags, ...visibleDiscoveryTags]
      : demoTags;

    if (!allTags.length) return;

    await navigator.clipboard.writeText(allTags.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputTitle = hasUserInteracted ? title : demoTitle;
  const displayTargetTags = hasUserInteracted ? visibleTargetTags : demoTags;
  const displayDiscoveryTags = hasUserInteracted ? visibleDiscoveryTags : [];
  const totalTags = displayTargetTags.length + displayDiscoveryTags.length;

  const demoStatusText =
    demoPhase === "typing"
      ? "Live demo typing..."
      : demoPhase === "generating"
        ? "Live demo generating..."
        : demoPhase === "revealing"
          ? "Live demo revealing..."
          : "Live demo running...";

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
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.85)",
          boxShadow:
            "0 8px 48px rgba(249,115,22,0.12), 0 2px 24px rgba(168,85,247,0.1), 0 1px 0 rgba(255,255,255,0.8) inset",
        }}
      >
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-stone-700">
              Tagloom Generator
            </span>
            {!hasUserInteracted ? (
              <span className="ml-auto text-xs italic text-stone-400">
                {demoStatusText}
              </span>
            ) : source ? (
              <span className="ml-auto text-xs italic text-stone-400">
                Source: {source}
              </span>
            ) : null}
          </div>

          <div className="mb-3">
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              Listing Title <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              value={inputTitle}
              onFocus={handleTitleFocus}
              onPaste={() => commitUserInteraction()}
              onChange={(e) => {
                commitUserInteraction();
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
                  Listing Description{" "}
                  <span className="font-normal text-stone-400">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onFocus={() => commitUserInteraction()}
                  onPaste={() => commitUserInteraction()}
                  onChange={(e) => {
                    commitUserInteraction();
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
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: title.trim()
                ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                : "#d1d5db",
              boxShadow: title.trim()
                ? "0 4px 20px rgba(249,115,22,0.35)"
                : "none",
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

          <AnimatePresence>
            {totalTags > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-700">
                    {totalTags} tags generated
                  </span>
                  <button
                    onClick={handleCopyAll}
                    className="flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 transition-all hover:bg-orange-100 hover:text-orange-700"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied!" : "Copy All"}
                  </button>
                </div>

                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  {hasUserInteracted ? "Target tags" : "Demo preview tags"}
                </p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {displayTargetTags.map((tag, i) => (
                    <motion.span
                      key={`${tag}-${i}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: i * 0.04,
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                      className="cursor-default rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm transition-colors hover:border-orange-300 hover:text-orange-700"
                    >
                      {tag}
                    </motion.span>
                  ))}
                </div>

                {hasUserInteracted ? (
                  <>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Discovery tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {displayDiscoveryTags.map((tag, i) => (
                        <motion.span
                          key={`${tag}-${i}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{
                            delay: i * 0.04,
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                          }}
                          className="cursor-default rounded-full border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-700 shadow-sm transition-colors hover:border-orange-300 hover:text-orange-700"
                        >
                          {tag}
                        </motion.span>
                      ))}
                    </div>
                  </>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {hasUserInteracted && (apiTargetTags.length !== visibleTargetTags.length || apiDiscoveryTags.length !== visibleDiscoveryTags.length) ? (
            <p className="mt-2 text-xs text-stone-500">Animating results...</p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
