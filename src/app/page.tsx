"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Tag,
  TrendingUp,
  Zap,
} from "lucide-react";

import TagGenerator from "@/components/tagsy/TagGenerator";
import { Card } from "@/components/ui/card";
import SiteFooter from "@/components/shared/SiteFooter";
import { consumePendingGeneratorCta, dispatchGeneratorCta } from "@/lib/generatorCta";

const fadeInUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

type FAQItemProps = {
  question: string;
  answer: string;
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

  const benefits = [
    {
      icon: TrendingUp,
      title: "More Views, Less Guesswork",
      description:
        "AI-crafted tags based on what buyers are actually searching for so your listings get found by the right people.",
      href: "/blog/how-to-rank-higher-on-etsy#why-tags-matter",
    },
    {
      icon: Clock,
      title: "Minutes, Not Hours",
      description:
        "Stop spending hours on keyword research and generate 13 optimized tags in seconds.",
      href: "/blog/how-to-rank-higher-on-etsy#keyword-research",
    },
    {
      icon: Zap,
      title: "Built for Etsy Search",
      description:
        "Every tag is selected to better align with Etsy search behavior and listing discoverability.",
      href: "/blog/how-to-rank-higher-on-etsy#ai-approach",
    },
  ];

  const pricing = [
    {
      name: "Single Use",
      price: "2",
      period: "one-time",
      description: "Try it once, no commitment",
      features: [
        "5 tag generations",
        "All 13 Etsy tag slots",
        "One-click copy",
        "Basic trend insights",
      ],
      cta: "Buy Once",
      popular: false,
      accent: true,
    },
    {
      name: "Monthly",
      price: "12",
      period: "/month",
      description: "For active sellers",
      features: [
        "Unlimited generations",
        "Advanced trend detection",
        "Performance insights",
        "Priority support",
        "Bulk generation",
      ],
      cta: "Start Free Trial",
      popular: true,
      accent: false,
    },
    {
      name: "Yearly",
      price: "99",
      period: "/year",
      description: "Best value - 2 months free",
      features: [
        "Everything in Monthly",
        "Early access to new features",
        "Dedicated onboarding",
        "Multiple shop support",
      ],
      cta: "Get Best Value",
      popular: false,
      accent: true,
    },
  ];

  const faqs = [
    {
      question: "How does Tagloom generate tags?",
      answer:
        "Tagloom uses AI with listing context to generate buyer-intent and discovery tags that fit Etsy's 13-slot format.",
    },
    {
      question: "Will these tags work for my niche?",
      answer:
        "Yes. The generator adapts to your listing title and description so tags stay relevant across categories.",
    },
    {
      question: "Do I need an Etsy account to use Tagloom?",
      answer:
        "No. Add listing details, generate tags, and paste them into your Etsy listing editor.",
    },
    {
      question: "How many tags does Etsy allow?",
      answer:
        "Etsy allows exactly 13 tags per listing, and Tagloom generates to that limit.",
    },
    {
      question: "Can I cancel anytime?",
      answer:
        "Yes. There are no long-term contracts in the current plan concepts shown on this page.",
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
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

        <div className="relative mx-auto max-w-2xl">
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
              className="mb-4 text-4xl font-bold leading-tight text-stone-900 sm:text-5xl"
            >
              The right tags.
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                More buyers.
              </span>
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              className="mx-auto mb-5 max-w-xl text-lg leading-relaxed text-stone-600"
            >
              Describe your Etsy listing and Tagloom instantly generates 13
              optimized tags with cleaner buyer intent phrasing.
            </motion.p>
            <motion.button
              variants={fadeInUp}
              onClick={triggerGeneratorFlow}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/30"
              style={{
                background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                boxShadow: "0 4px 20px rgba(249,115,22,0.35)",
              }}
            >
              Try it free - no card needed
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </motion.div>

          <div className="mt-16">
            <TagGenerator />
          </div>
        </div>
      </section>

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
              What you actually get
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid gap-6 md:grid-cols-3"
          >
            {benefits.map((b) => (
              <motion.div key={b.title} variants={fadeInUp}>
                <Link href={b.href} className="group block h-full">
                  <Card className="flex h-full flex-col border-stone-100 bg-stone-50 p-6 transition-all group-hover:-translate-y-1 group-hover:shadow-lg">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
                      <b.icon className="h-5 w-5 text-orange-600" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-stone-900">
                      {b.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-stone-600">
                      {b.description}
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
              Simple, honest pricing
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="mx-auto max-w-lg text-stone-500"
            >
              No tricks. Start free, upgrade when you need more.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
            className="grid gap-6 md:grid-cols-3"
          >
            {pricing.map((plan) => (
              <motion.div key={plan.name} variants={fadeInUp}>
                <Card
                  className={`group relative flex h-full flex-col p-7 transition-all hover:-translate-y-1 hover:shadow-xl ${
                    plan.popular
                      ? "border-2 border-orange-400 shadow-xl shadow-orange-500/10"
                      : "border-stone-100 hover:border-orange-200"
                  }`}
                >
                  {plan.popular ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="relative overflow-hidden rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1 text-xs font-semibold text-white shadow">
                        <span className="pointer-events-none absolute -left-1/3 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-0 transition-all duration-700 group-hover:left-[110%] group-hover:opacity-100" />
                        <span className="relative z-10">
                          Most Popular
                        </span>
                      </span>
                    </div>
                  ) : null}
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
                    {plan.name}
                  </p>
                  <p className="mb-4 text-sm text-stone-500">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-stone-900">
                      ${plan.price}
                    </span>
                    <span className="ml-1 text-sm text-stone-400">
                      {plan.period}
                    </span>
                  </div>
                  <ul className="mb-8 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                        <span className="text-sm text-stone-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={triggerGeneratorFlow}
                    className={`relative mt-auto w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                      plan.popular
                        ? "text-white shadow-lg shadow-orange-500/20 hover:-translate-y-0.5"
                        : plan.accent
                          ? "border border-orange-300 bg-orange-50 text-orange-700 hover:-translate-y-0.5 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-100"
                          : "bg-stone-100 text-stone-800 hover:bg-stone-200"
                    }`}
                    style={
                      plan.popular
                        ? {
                            background:
                              "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                          }
                        : {}
                    }
                  >
                    {plan.cta}
                  </button>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

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
                Ready to get more eyes on your listings?
              </motion.h2>
              <motion.p
                variants={fadeInUp}
                className="mx-auto mb-8 max-w-lg leading-relaxed text-stone-600"
              >
                Start with your next Etsy listing and generate a complete 13-tag
                set in under a minute.
              </motion.p>
              <motion.button
                variants={fadeInUp}
                onClick={triggerGeneratorFlow}
                className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-500/30"
                style={{
                  background:
                    "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  boxShadow: "0 6px 28px rgba(249,115,22,0.32)",
                }}
              >
                Generate Tags Free
                <ArrowRight className="h-5 w-5" />
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
