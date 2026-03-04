"use client";

import { useRef, useState } from "react";
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

import Navbar from "@/components/tagsy/Navbar";
import TagGenerator from "@/components/tagsy/TagGenerator";
import { Card } from "@/components/ui/card";

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

function scrollToGenerator() {
  document
    .getElementById("generator")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export default function HomePage() {
  const generatorRef = useRef<HTMLDivElement>(null);

  const benefits = [
    {
      icon: TrendingUp,
      title: "More Views, Less Guesswork",
      description:
        "AI-crafted tags based on what buyers are actually searching for so your listings get found by the right people.",
    },
    {
      icon: Clock,
      title: "Minutes, Not Hours",
      description:
        "Stop spending hours on keyword research and generate 13 optimized tags in seconds.",
    },
    {
      icon: Zap,
      title: "Built for Etsy Search",
      description:
        "Every tag is selected to better align with Etsy search behavior and listing discoverability.",
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
      <Navbar />

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
            className="mb-10 text-center"
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
              className="mx-auto mb-8 max-w-xl text-lg leading-relaxed text-stone-600"
            >
              Describe your Etsy listing and Tagloom instantly generates 13
              optimized tags with cleaner buyer intent phrasing.
            </motion.p>
            <motion.button
              variants={fadeInUp}
              onClick={scrollToGenerator}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                boxShadow: "0 4px 20px rgba(249,115,22,0.35)",
              }}
            >
              Try it free - no card needed
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </motion.div>

          <TagGenerator glowRef={generatorRef} />
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
              Why Tagloom
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
                <Card className="h-full border-stone-100 bg-stone-50 p-6 transition-all hover:shadow-md">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
                    <b.icon className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-stone-900">
                    {b.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-stone-600">
                    {b.description}
                  </p>
                </Card>
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
                  className={`relative h-full p-7 ${plan.popular ? "border-2 border-orange-400 shadow-xl shadow-orange-500/10" : "border-stone-100"}`}
                >
                  {plan.popular ? (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1 text-xs font-semibold text-white shadow">
                        Most Popular
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
                    onClick={plan.popular ? scrollToGenerator : undefined}
                    className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                      plan.popular
                        ? "text-white shadow-lg shadow-orange-500/20"
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
            animate={{ scale: [1, 1.08, 1], x: [0, 10, 0] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-20 -top-20 h-[360px] w-[500px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(251,146,60,0.45) 0%, transparent 65%)",
              filter: "blur(60px)",
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], x: [0, -12, 0] }}
            transition={{
              duration: 11,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5,
            }}
            className="absolute right-0 top-0 h-[320px] w-[420px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(168,85,247,0.38) 0%, transparent 65%)",
              filter: "blur(60px)",
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="absolute bottom-0 left-1/3 h-[260px] w-[360px] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse, rgba(236,72,153,0.3) 0%, transparent 65%)",
              filter: "blur(56px)",
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
                background: "rgba(255,255,255,0.68)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                border: "1px solid rgba(255,255,255,0.85)",
                boxShadow:
                  "0 8px 48px rgba(249,115,22,0.12), 0 2px 24px rgba(168,85,247,0.1)",
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
                onClick={scrollToGenerator}
                className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-semibold text-white transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  boxShadow: "0 6px 28px rgba(249,115,22,0.4)",
                }}
              >
                Generate Tags Free
                <ArrowRight className="h-5 w-5" />
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-orange-600">
              <Tag className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-stone-800">Tagloom</span>
          </div>
          <div className="flex items-center gap-7 text-sm text-stone-400">
            <a href="#" className="transition-colors hover:text-stone-700">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-stone-700">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-stone-700">
              Support
            </a>
          </div>
          <p className="text-xs text-stone-400">© 2026 Tagloom. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
