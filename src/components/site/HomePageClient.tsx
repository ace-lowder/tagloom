"use client";

import Link from "next/link";
import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronDown, Copy, Sparkles, Tag } from "lucide-react";

import PricingCards from "@/components/pricing/PricingCards";
import { usePricingActions } from "@/components/pricing/usePricingActions";
import Generator from "@/components/generator/Generator";
import { useAuthController } from "@/components/auth/AuthController";
import { useToast } from "@/components/toasts/toasts";
import { toastMessages } from "@/components/toasts/toastMessages";
import { buttonClassNames } from "@/components/ui/button";
import SiteFooter from "@/components/shared/SiteFooter";
import { consumePendingGeneratorCta, dispatchGeneratorCta } from "@/lib/generatorCta";
import {
  aboutSectionCopy,
  faqs,
  featureSectionCopy,
  homeBlogCards,
  type FAQAnswerPart,
  type FAQEntry,
} from "@/content/home";

export type HomePricingState = {
  isLoggedIn: boolean;
  currentTier: "monthly" | "yearly" | null;
  isExpiring: boolean;
  pendingRenewalTier: "monthly" | "yearly" | null;
  pendingRenewalAt: string | null;
  allowStarterPurchaseWithSubscription: boolean;
  canManageSubscription: boolean;
};

const fadeInUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

export const benefits = featureSectionCopy.steps;
export const heroCopy = {
  pill: "Etsy tag generator for sellers",
  headlineStart: "Generate Etsy tags that",
  headlineEmphasis: "help shoppers find your listings",
  body:
    "Etsy tags are keywords shoppers search for. Paste your listing, generate tags, and copy them into Etsy.",
  cta: "Generate tags for free",
};

type HomePageClientProps = {
  pricingState: HomePricingState;
};

export default function HomePageClient({ pricingState }: HomePageClientProps) {
  const [historyPreviewMode, setHistoryPreviewMode] = useState<"generator" | "history">(
    "generator",
  );
  const [isHistoryPreviewPaused, setIsHistoryPreviewPaused] = useState(false);
  const [isFeatureCopyComplete, setIsFeatureCopyComplete] = useState(false);

  const triggerGeneratorFlow = () => {
    dispatchGeneratorCta({ requestReset: true }, { smoothScroll: true });
  };

  useEffect(() => {
    const pending = consumePendingGeneratorCta();
    if (!pending) return;

    const timeout = window.setTimeout(() => {
      dispatchGeneratorCta(
        { requestReset: pending.requestReset },
        { smoothScroll: true },
      );
    }, 220);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (isHistoryPreviewPaused) return;

    const interval = window.setInterval(() => {
      setHistoryPreviewMode((current) =>
        current === "generator" ? "history" : "generator",
      );
    }, 2400);

    return () => window.clearInterval(interval);
  }, [isHistoryPreviewPaused]);

  useEffect(() => {
    if (!isFeatureCopyComplete) return;

    const timeout = window.setTimeout(() => {
      setIsFeatureCopyComplete(false);
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [isFeatureCopyComplete]);

  const handleFeatureCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(featureSectionCopy.copyTags.join(", "));
      setIsFeatureCopyComplete(false);
      window.setTimeout(() => setIsFeatureCopyComplete(true), 0);
    } catch {
      // Fail silently if clipboard access is unavailable.
    }
  };

  return (
    <div id="home" className="min-h-screen bg-stone-50 font-sans">
      <HeroSection onGenerate={triggerGeneratorFlow} />
      <AboutSection />
      <FeaturesSection
        onGenerate={triggerGeneratorFlow}
        historyPreviewMode={historyPreviewMode}
        setHistoryPreviewMode={setHistoryPreviewMode}
        setIsHistoryPreviewPaused={setIsHistoryPreviewPaused}
        isFeatureCopyComplete={isFeatureCopyComplete}
        onCopyAll={handleFeatureCopyAll}
      />
      <PricingSection pricingState={pricingState} />
      <BlogSection />
      <FaqSection faqs={faqs} />
      <BottomCtaSection onGenerate={triggerGeneratorFlow} />
      <SiteFooter />
    </div>
  );
}

type HeroSectionProps = {
  onGenerate: () => void;
};

function HeroSection({ onGenerate }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden px-5 pb-24 pt-28">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div
          className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(ellipse, rgba(253,186,116,0.35) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center">
          <motion.div
            variants={fadeInUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-medium text-orange-700"
          >
            <Tag className="h-3.5 w-3.5" />
            {heroCopy.pill}
          </motion.div>
          <motion.h1
            variants={fadeInUp}
            className="mb-3 text-4xl font-bold leading-[1.06] text-stone-900 sm:text-5xl"
          >
            {heroCopy.headlineStart}
            <span className="mt-2 block pb-1 leading-[1.12] bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              {heroCopy.headlineEmphasis}
            </span>
          </motion.h1>
          <motion.p variants={fadeInUp} className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-stone-600">
            {heroCopy.body}
          </motion.p>
          <motion.div variants={fadeInUp} className="inline-flex">
            <button
              onClick={onGenerate}
              className={buttonClassNames({
                className: "gap-2 px-6 shadow-[0_4px_20px_rgba(249,115,22,0.35)]",
              })}
              style={{ boxShadow: "0 4px 20px rgba(249,115,22,0.35)" }}
            >
              {heroCopy.cta}
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>

        <div className="mt-24">
          <Generator />
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <motion.section
      id="about"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeInUp}
      className="scroll-mt-24 bg-[#ffead6] px-6 py-10 sm:py-12"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600">
            {aboutSectionCopy.eyebrow}
          </p>
          <h2 className="mx-auto max-w-4xl text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            {aboutSectionCopy.heading}
          </h2>
        </div>
        <p className="mx-auto mt-5 max-w-5xl text-left text-base leading-8 text-stone-700 sm:text-lg">
          {aboutSectionCopy.body}
        </p>
        <div className="mx-auto mt-5 flex max-w-5xl justify-end">
          <Link
            href="/blog"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-stone-500 transition-colors hover:text-orange-600"
          >
            {aboutSectionCopy.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

type FeaturesSectionProps = {
  onGenerate: () => void;
  historyPreviewMode: "generator" | "history";
  setHistoryPreviewMode: Dispatch<SetStateAction<"generator" | "history">>;
  setIsHistoryPreviewPaused: Dispatch<SetStateAction<boolean>>;
  isFeatureCopyComplete: boolean;
  onCopyAll: () => void;
};

function FeaturesSection({
  onGenerate,
  historyPreviewMode,
  setHistoryPreviewMode,
  setIsHistoryPreviewPaused,
  isFeatureCopyComplete,
  onCopyAll,
}: FeaturesSectionProps) {
  return (
    <motion.section
      id="features"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={stagger}
      className="bg-white px-5 py-24"
    >
      <div className="mx-auto max-w-5xl">
        <motion.div
          variants={stagger}
          className="mb-12 text-center"
        >
          <motion.p variants={fadeInUp} className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600">
            {featureSectionCopy.eyebrow}
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-stone-900 sm:text-4xl">
            {featureSectionCopy.heading}
          </motion.h2>
          <motion.p variants={fadeInUp} className="mx-auto mt-3 max-w-2xl text-stone-600">
            {featureSectionCopy.subcopy}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="mt-10 grid gap-6 md:grid-cols-3"
        >
          <motion.div variants={fadeInUp}>
            <FeaturePreviewCard>
              <FeatureListingPreview onGenerate={onGenerate} />
            </FeaturePreviewCard>
            <FeatureStepCopy
              title={featureSectionCopy.steps[0].title}
              description={featureSectionCopy.steps[0].description}
            />
          </motion.div>

          <motion.div variants={fadeInUp}>
            <FeaturePreviewCard
              onMouseEnter={() => setIsHistoryPreviewPaused(true)}
              onMouseLeave={() => setIsHistoryPreviewPaused(false)}
            >
              <FeatureHistoryPreview
                mode={historyPreviewMode}
                onChangeMode={setHistoryPreviewMode}
              />
            </FeaturePreviewCard>
            <FeatureStepCopy
              title={featureSectionCopy.steps[1].title}
              description={featureSectionCopy.steps[1].description}
            />
          </motion.div>

          <motion.div variants={fadeInUp}>
            <FeaturePreviewCard>
              <FeatureCopyPreview
                isCopied={isFeatureCopyComplete}
                onCopyAll={onCopyAll}
              />
            </FeaturePreviewCard>
            <FeatureStepCopy
              title={featureSectionCopy.steps[2].title}
              description={featureSectionCopy.steps[2].description}
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}

function FeaturePreviewCard({
  children,
  onMouseEnter,
  onMouseLeave,
}: {
  children: ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) {
  return (
    <div
      className="rounded-2xl border border-orange-100/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(249,115,22,0.10)]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

function FeaturePreviewHeader({
  rightSlot,
}: {
  rightSlot?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-semibold text-stone-800">
          Tagloom Generator
        </span>
      </div>
      {rightSlot ? <div>{rightSlot}</div> : null}
    </div>
  );
}

function FeatureStepCopy({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
    </div>
  );
}

function FeatureListingPreview({ onGenerate }: { onGenerate: () => void }) {
  return (
    <>
      <FeaturePreviewHeader />
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-stone-500">
            Listing Title
          </label>
          <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            {featureSectionCopy.demoTitle}
          </div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">
          {featureSectionCopy.demoDescription}
        </div>
        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(249,115,22,0.28)] transition-all hover:from-orange-600 hover:to-orange-700"
        >
          Generate tags
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

function FeatureHistoryPreview({
  mode,
  onChangeMode,
}: {
  mode: "generator" | "history";
  onChangeMode: Dispatch<SetStateAction<"generator" | "history">>;
}) {
  return (
    <>
      <FeaturePreviewHeader
        rightSlot={
          <div className="rounded-full bg-orange-50 p-1">
            <button
              type="button"
              onClick={() => onChangeMode("generator")}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                mode === "generator"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-stone-500 hover:text-orange-600"
              }`}
            >
              Generator
            </button>
            <button
              type="button"
              onClick={() => onChangeMode("history")}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                mode === "history"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-stone-500 hover:text-orange-600"
              }`}
            >
              History
            </button>
          </div>
        }
      />

      <div className="min-h-[188px]">
        <AnimatePresence mode="wait" initial={false}>
          {mode === "generator" ? (
            <motion.div
              key="generator"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-3"
            >
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                Listing title
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">
                Listing description
              </div>
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(249,115,22,0.28)]"
              >
                Generate tags
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-2"
            >
              {featureSectionCopy.historyRows.map((row) => (
                <div
                  key={row}
                  className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700"
                >
                  {row}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function FeatureCopyPreview({
  isCopied,
  onCopyAll,
}: {
  isCopied: boolean;
  onCopyAll: () => void;
}) {
  return (
    <>
      <FeaturePreviewHeader />
      <div className="space-y-4">
        <div className="text-sm font-medium text-stone-600">13 tags generated</div>
        <div className="flex flex-wrap gap-2">
          {featureSectionCopy.copyTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-700"
            >
              {tag}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onCopyAll}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(249,115,22,0.24)] transition-colors hover:bg-orange-600"
        >
          <Copy className="h-4 w-4" />
          {isCopied ? "Copied" : "Copy all"}
        </button>
      </div>
    </>
  );
}

type PricingSectionProps = {
  pricingState: HomePricingState;
};

function PricingSection({ pricingState }: PricingSectionProps) {
  const {
    isLoggedIn,
    currentTier,
    pendingRenewalTier,
    pendingRenewalAt,
    allowStarterPurchaseWithSubscription,
    canManageSubscription,
  } = pricingState;
  const router = useRouter();
  const { openAuthModal } = useAuthController();
  const { showToast } = useToast();
  const renewingLabel = pendingRenewalAt
    ? `Renewing on ${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(pendingRenewalAt))}`
    : "Renewing soon";

  const { isAnyRedirecting, redirectingPlanId, onSelectPlan, onManagePortal } =
    usePricingActions({
      isLoggedIn,
      subscriptionActive: Boolean(currentTier),
      currentTier,
      canManageSubscription,
      onRequireAuth: () =>
        openAuthModal({
          mode: "signup",
          source: "homepage_pricing",
          next: "/billing",
        }),
      onRefresh: () => router.refresh(),
      onError: (message) =>
        showToast({
          ...toastMessages.checkoutFailed,
          body: message,
        }),
    });

  return (
    <section id="pricing" className="bg-stone-50 px-5 py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="mb-14 text-center">
          <motion.p variants={fadeInUp} className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600">
            Pricing
          </motion.p>
          <motion.h2 variants={fadeInUp} className="mb-3 text-3xl font-bold text-stone-900 sm:text-4xl">
            Keep running test cycles as your listings evolve
          </motion.h2>
          <motion.p variants={fadeInUp} className="mx-auto max-w-2xl text-stone-500">
            Generate, compare, update Etsy listings, and keep learning from your results and the crash-course guides.
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid">
          <PricingCards
            onSelectPlan={onSelectPlan}
            currentTier={isLoggedIn ? currentTier : null}
            showCurrentPlanBadge={isLoggedIn}
            disableCurrentPlanAction={false}
            disableAllActions={isAnyRedirecting}
            allowCurrentPlanAction={isLoggedIn && Boolean(currentTier)}
            currentPlanActionLabel="Manage plan"
            onCurrentPlanAction={onManagePortal}
            isCurrentPlanActionLoading={Boolean(
              currentTier && redirectingPlanId === currentTier,
            )}
            loadingPlanId={redirectingPlanId}
            renewingTier={isLoggedIn ? pendingRenewalTier : null}
            renewingLabel={renewingLabel}
            allowStarterPurchaseWithSubscription={allowStarterPurchaseWithSubscription}
          />
        </motion.div>
      </div>
    </section>
  );
}

function BlogSection() {
  return (
    <section className="bg-white px-5 py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="mb-10 text-center">
          <motion.p variants={fadeInUp} className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600">
            Blog Crash Course
          </motion.p>
          <motion.h2 variants={fadeInUp} className="mb-3 text-3xl font-bold text-stone-900 sm:text-4xl">
            Learn the tag strategy behind each update
          </motion.h2>
          <motion.p variants={fadeInUp} className="mx-auto max-w-2xl text-stone-600">
            Use the guides below to understand Etsy search behavior and improve listings with clearer buyer-intent tags.
          </motion.p>
        </motion.div>
        <div className="grid gap-4 md:grid-cols-3">
          {homeBlogCards.map((card) => (
            <Link key={card.title} href={card.href} className="group rounded-2xl border border-stone-100 bg-stone-50 p-5 transition-all hover:-translate-y-0.5 hover:border-orange-200">
              <h3 className="mb-2 font-semibold text-stone-900 group-hover:text-orange-600">{card.title}</h3>
              <p className="mb-3 text-sm text-stone-600">{card.body}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600">
                Read guide
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

type FaqSectionProps = {
  faqs: FAQEntry[];
};

function FaqSection({ faqs }: FaqSectionProps) {
  return (
    <section id="faq" className="bg-white px-5 py-24">
      <div className="mx-auto max-w-2xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="mb-14 text-center">
          <motion.p variants={fadeInUp} className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600">
            FAQ
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-stone-900 sm:text-4xl">
            Frequently asked questions
          </motion.h2>
        </motion.div>
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeInUp} className="rounded-2xl border border-stone-100 bg-stone-50 px-6">
          {faqs.map((faq) => (
            <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

type BottomCtaSectionProps = {
  onGenerate: () => void;
};

function BottomCtaSection({ onGenerate }: BottomCtaSectionProps) {
  return (
    <section className="relative overflow-hidden px-5 py-20">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <motion.div
          animate={{ scale: [1, 1.07, 1], x: [0, 10, 0], y: [0, -7, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-20 -top-20 h-[320px] w-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(251,146,60,0.42) 0%, transparent 65%)",
            filter: "blur(64px)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-2xl text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}>
          <motion.div
            variants={fadeInUp}
            className="rounded-3xl px-8 py-14 sm:px-14"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.88)",
              boxShadow:
                "0 8px 44px rgba(249,115,22,0.1), 0 2px 22px rgba(251,191,36,0.08)",
            }}
          >
            <motion.h2 variants={fadeInUp} className="mb-4 text-3xl font-bold text-stone-900 sm:text-4xl">
              Ready for your next listing test cycle?
            </motion.h2>
            <motion.p variants={fadeInUp} className="mx-auto mb-8 max-w-lg leading-relaxed text-stone-600">
              Generate a fresh 13-tag set, apply in Etsy, and keep improving listing visibility with clear buyer-intent keywords.
            </motion.p>
            <motion.div variants={fadeInUp} className="inline-flex">
              <button
                onClick={onGenerate}
                className={buttonClassNames({
                  className:
                    "gap-2 px-8 py-4 shadow-[0_6px_28px_rgba(249,115,22,0.32)]",
                })}
                style={{ boxShadow: "0 6px 28px rgba(249,115,22,0.32)" }}
              >
                Generate Free Tags
                <ArrowRight className="h-5 w-5" />
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

type FAQItemProps = {
  question: string;
  answer: FAQAnswerPart[];
};

function FAQItem({ question, answer }: FAQItemProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="last:border-0 border-b border-stone-200">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="group flex w-full items-center justify-between py-5 text-left"
      >
        <span className="pr-4 font-medium text-stone-800 transition-colors group-hover:text-orange-600">
          {question}
        </span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <motion.div initial={false} animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }} className="overflow-hidden">
        <p className="pb-5 leading-relaxed text-stone-600">
          {answer.map((part, index) =>
            part.type === "text" ? (
              <span key={`${question}-text-${index}`}>{part.text}</span>
            ) : (
              <Link
                key={`${question}-link-${part.href}-${index}`}
                href={part.href}
                className="font-medium text-orange-700 hover:text-orange-800"
              >
                {part.text}
              </Link>
            ),
          )}
        </p>
      </motion.div>
    </div>
  );
}
