"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Tag } from "lucide-react";

import PricingCards from "@/components/pricing/PricingCards";
import { usePricingActions } from "@/components/pricing/usePricingActions";
import Generator from "@/components/generator/Generator";
import { useAuthController } from "@/components/auth/AuthController";
import { useToast } from "@/components/toasts/toasts";
import { toastMessages } from "@/components/toasts/toastMessages";
import { Card } from "@/components/ui/card";
import { buttonClassNames } from "@/components/ui/button";
import SiteFooter from "@/components/shared/SiteFooter";
import { consumePendingGeneratorCta, dispatchGeneratorCta } from "@/lib/generatorCta";
import {
  aboutSectionCopy,
  faqs,
  featurePreviews,
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

export const benefits = featurePreviews;
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

  return (
    <div id="home" className="min-h-screen bg-stone-50 font-sans">
      <HeroSection onGenerate={triggerGeneratorFlow} />
      <AboutSection />
      <FeaturesSection />
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
    <section
      id="about"
      className="scroll-mt-24 bg-stone-100/70 px-6 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
          <div className="text-center">
            <motion.p
              variants={fadeInUp}
              className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600"
            >
              {aboutSectionCopy.eyebrow}
            </motion.p>
            <motion.h2
              variants={fadeInUp}
              className="mt-4 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl"
            >
              {aboutSectionCopy.heading}
            </motion.h2>
          </div>

          <div className="mx-auto mt-6 max-w-3xl space-y-4 text-center text-base leading-8 text-stone-700 sm:text-lg">
            <motion.p variants={fadeInUp}>
              {aboutSectionCopy.paragraphs[0]}
            </motion.p>
            <motion.p variants={fadeInUp}>
              {aboutSectionCopy.paragraphs[1]}
            </motion.p>
          </div>

          <div className="mx-auto mt-8 flex max-w-3xl justify-end">
            <motion.div variants={fadeInUp}>
              <Link
                href="/blog"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-stone-500 transition-colors hover:text-orange-600"
              >
                {aboutSectionCopy.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="bg-white px-5 py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="mb-12 text-center">
          <motion.p variants={fadeInUp} className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600">
            Features
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-stone-900 sm:text-4xl">
            A simple workflow for ongoing tag improvement
          </motion.h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="grid gap-6 md:grid-cols-3">
          {featurePreviews.map((preview) => (
            <motion.div key={preview.title} variants={fadeInUp}>
              <Card className="h-full border-stone-100 bg-stone-50 p-6">
                <h3 className="mb-2 text-lg font-semibold text-stone-900">{preview.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-stone-600">{preview.description}</p>
                <div className="rounded-xl border border-stone-200 bg-white p-3">
                  <div className="mb-3 space-y-2">
                    {preview.lines.map((line) => (
                      <div key={line} className="h-7 rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-600">
                        {line}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-700"
                  >
                    {preview.actionLabel}
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
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
