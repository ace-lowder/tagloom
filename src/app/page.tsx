"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  Tag,
  TrendingUp,
  Zap,
} from "lucide-react";

import PricingCards from "@/components/pricing/PricingCards";
import TagGenerator from "@/components/tagsy/TagGenerator";
import { Card } from "@/components/ui/card";
import SiteFooter from "@/components/shared/SiteFooter";
import { consumePendingGeneratorCta, dispatchGeneratorCta } from "@/lib/generatorCta";

const fadeInUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

type BenefitItem = {
  icon: typeof TrendingUp;
  title: string;
  description: string;
  href: string;
};

type FAQEntry = {
  question: string;
  answer: ReactNode;
};

const benefits: BenefitItem[] = [
  {
    icon: TrendingUp,
    title: "Get found in Etsy search",
    description:
      "AI-crafted tags based on what buyers are actually searching for so your listings get found by the right people.",
    href: "/blog/how-to-rank-higher-on-etsy#why-tags-matter",
  },
  {
    icon: Clock,
    title: "13 tags in seconds",
    description:
      "Stop spending hours on keyword research and generate 13 optimized tags in seconds.",
    href: "/blog/how-to-rank-higher-on-etsy#keyword-research",
  },
  {
    icon: Zap,
    title: "Stop guessing keywords.",
    description:
      "Every tag is selected to better align with Etsy search behavior and listing discoverability.",
    href: "/blog/how-to-rank-higher-on-etsy#ai-approach",
  },
];

const faqs: FAQEntry[] = [
  {
    question: "How does Tagloom generate tags?",
    answer:
      "Tagloom analyzes your title and description, identifies high-intent keywords, and builds a balanced 13-tag set that combines direct search terms with broader discovery terms.",
  },
  {
    question: "Will these tags work for my niche?",
    answer:
      "Yes, because tags are generated from your listing context and optimized for both exact-match shopper intent and niche discovery, so they stay relevant across categories.",
  },
  {
    question: "Do I need to connect my Etsy account to Tagloom?",
    answer:
      "No, you don't need to connect anything. Generate your tags here, then quickly copy and paste them into your Etsy listing.",
  },
  {
    question: "Can I generate tags for free?",
    answer:
      "Yes, every account gets 1 free generation so you can test Tagloom before upgrading.",
  },
  {
    question: "Can I switch between Monthly and Yearly plans?",
    answer: (
      <>
        Yes, you can switch between Monthly and Yearly anytime from your{" "}
        <Link href="/billing" className="font-medium text-orange-700 hover:text-orange-800">
          billing settings
        </Link>
        .
      </>
    ),
  },
  {
    question: "What happens when I run out of monthly generations?",
    answer:
      "Your Monthly generation limit resets on your billing date, and if you need more before then you can upgrade to Yearly for unlimited generations or buy Starter generations.",
  },
  {
    question: "Where can I manage my plan?",
    answer: (
      <>
        Open the profile icon in the top-right corner, click{" "}
        <Link href="/billing" className="font-medium text-orange-700 hover:text-orange-800">
          Billing
        </Link>
        , and manage your plan there.
      </>
    ),
  },
  {
    question: "How many tags does Etsy allow?",
    answer:
      "Etsy allows 13 tags per listing, and Tagloom gives you all 13 so you can fully use every slot.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, you can cancel anytime in billing and your plan stays active until the end of your current period, then you won't be charged again.",
  },
];

export default function HomePage() {
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
    <div className="min-h-screen bg-stone-50 font-sans">
      <HeroSection onGenerate={triggerGeneratorFlow} />
      <FeaturesSection benefits={benefits} />
      <PricingSection onGenerate={triggerGeneratorFlow} />
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
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="text-center"
        >
          <motion.div
            variants={fadeInUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-sm font-medium text-orange-700"
          >
            <Tag className="h-3.5 w-3.5" />
            AI Tag Generator for Etsy Sellers
          </motion.div>
          <motion.h1
            variants={fadeInUp}
            className="mb-3 text-4xl font-bold leading-[1.06] text-stone-900 sm:text-5xl"
          >
            <span className="md:whitespace-nowrap">Etsy tags buyers actually search</span>
            <span className="mt-2 block bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              More clicks. More sales.
            </span>
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-stone-600"
          >
            Paste your Etsy listing. Get 13 tags buyers are already searching.
          </motion.p>
          <motion.button
            variants={fadeInUp}
            onClick={onGenerate}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
            style={{
              boxShadow: "0 4px 20px rgba(249,115,22,0.35)",
            }}
          >
            Generate free tags
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>

        <div className="mt-24">
          <TagGenerator />
        </div>
      </div>
    </section>
  );
}

type FeaturesSectionProps = {
  benefits: BenefitItem[];
};

function FeaturesSection({ benefits }: FeaturesSectionProps) {
  return (
    <section id="features" className="bg-white px-5 py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="mb-14 text-center"
        >
          <motion.p
            variants={fadeInUp}
            className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600"
          >
            Features
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold text-stone-900 sm:text-4xl"
          >
            How this gets you more sales
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="grid gap-6 md:grid-cols-3"
        >
          {benefits.map((benefit) => (
            <motion.div key={benefit.title} variants={fadeInUp}>
              <Link href={benefit.href} className="group block h-full">
                <Card className="flex h-full flex-col border-stone-100 bg-stone-50 p-6 transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
                    <benefit.icon className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-stone-900">
                    {benefit.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-stone-600">
                    {benefit.description}
                  </p>
                  <span className="mt-auto pt-4 inline-flex items-center gap-1 text-sm font-semibold text-orange-600">
                    Read more
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

type PricingSectionProps = {
  onGenerate: () => void;
};

function PricingSection({ onGenerate }: PricingSectionProps) {
  return (
    <section id="pricing" className="bg-stone-50 px-5 py-24">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="mb-14 text-center"
        >
          <motion.p
            variants={fadeInUp}
            className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600"
          >
            Pricing
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className="mb-3 text-3xl font-bold text-stone-900 sm:text-4xl"
          >
            Simple pricing, clear outcomes.
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mx-auto max-w-lg text-stone-500"
          >
            Start free, upgrade when better tags drive more sales.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="grid"
        >
          <PricingCards onSelectPlan={() => onGenerate()} />
        </motion.div>
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
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="mb-14 text-center"
        >
          <motion.p
            variants={fadeInUp}
            className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600"
          >
            FAQ
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-bold text-stone-900 sm:text-4xl"
          >
            Common questions
          </motion.h2>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeInUp}
          className="rounded-2xl border border-stone-100 bg-stone-50 px-6"
        >
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
        <motion.div
          animate={{ scale: [1, 1.08, 1], x: [0, -12, 0], y: [0, 8, 0] }}
          transition={{
            duration: 11,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.2,
          }}
          className="absolute right-0 top-0 h-[300px] w-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(168,85,247,0.24) 0%, transparent 66%)",
            filter: "blur(60px)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.05, 1], x: [0, 6, 0], y: [0, 5, 0] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
          className="absolute bottom-0 left-1/3 h-[240px] w-[340px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(236,72,153,0.2) 0%, transparent 66%)",
            filter: "blur(58px)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-2xl text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
        >
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
            <motion.h2
              variants={fadeInUp}
              className="mb-4 text-3xl font-bold text-stone-900 sm:text-4xl"
            >
              Ready to get found by more Etsy buyers?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mx-auto mb-8 max-w-lg leading-relaxed text-stone-600"
            >
              Generate 13 high-intent tags for your next listing in under a minute.
            </motion.p>
            <motion.button
              variants={fadeInUp}
              onClick={onGenerate}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-8 py-4 text-sm font-semibold text-white transition-all hover:from-orange-600 hover:to-orange-700"
              style={{
                boxShadow: "0 6px 28px rgba(249,115,22,0.32)",
              }}
            >
              Generate Free Tags
              <ArrowRight className="h-5 w-5" />
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

type FAQItemProps = {
  question: string;
  answer: ReactNode;
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
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        className="overflow-hidden"
      >
        <p className="pb-5 leading-relaxed text-stone-600">{answer}</p>
      </motion.div>
    </div>
  );
}
