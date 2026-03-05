"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  CreditCard,
  HelpCircle,
  Mail,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  User,
} from "lucide-react";
import type { SupportArticle, SupportTopic } from "@/content/support";
import Navbar from "@/components/tagsy/Navbar";
import BrandMark from "@/components/brand/BrandMark";

const fadeInUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

const topicIcons = {
  user: User,
  "credit-card": CreditCard,
  sparkles: Sparkles,
  "rotate-ccw": RotateCcw,
  tag: Tag,
  "help-circle": HelpCircle,
};

type SupportHubPageProps = {
  topics: SupportTopic[];
  articles: SupportArticle[];
};

export default function SupportHubPage({ topics, articles }: SupportHubPageProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const resetSupport = () => {
      setSearch("");
    };

    window.addEventListener("tagloom:support-reset", resetSupport);
    return () => window.removeEventListener("tagloom:support-reset", resetSupport);
  }, []);

  const filteredArticles = useMemo(
    () =>
      articles.filter((article) =>
        article.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [articles, search],
  );

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <Navbar />

      <section className="border-b border-stone-100 bg-white px-5 pb-16 pt-28">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p
              variants={fadeInUp}
              className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600"
            >
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="transition-colors hover:text-orange-700"
              >
                Help Center
              </button>
            </motion.p>
            <motion.h1
              variants={fadeInUp}
              className="mb-4 text-4xl font-bold text-stone-900 sm:text-5xl"
            >
              How can we help?
            </motion.h1>
            <motion.div variants={fadeInUp} className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search help articles..."
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 py-4 pl-12 pr-5 text-base text-stone-800 shadow-sm transition-all placeholder-stone-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-5 py-14">
        {!search ? (
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.h2 variants={fadeInUp} className="mb-6 text-lg font-bold text-stone-900">
              Browse by topic
            </motion.h2>
            <motion.div variants={stagger} className="mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => {
                const Icon = topicIcons[topic.icon];
                return (
                  <motion.div key={topic.slug} variants={fadeInUp}>
                    <Link
                      href={`/support/${topic.slug}`}
                      className="group block rounded-2xl border border-stone-100 bg-white p-5 text-left transition-all hover:border-orange-200 hover:shadow-md"
                    >
                      <div
                        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${topic.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mb-1 font-semibold text-stone-800 transition-colors group-hover:text-orange-600">
                        {topic.name}
                      </h3>
                      <p className="text-xs leading-relaxed text-stone-500">
                        {topic.description}
                      </p>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.h2 variants={fadeInUp} className="mb-4 text-lg font-bold text-stone-900">
              Popular articles
            </motion.h2>
            <motion.div
              variants={stagger}
              className="divide-y divide-stone-100 rounded-2xl border border-stone-100 bg-white"
            >
              {articles.map((article) => (
                <motion.div key={article.slug} variants={fadeInUp}>
                  <Link
                    href={`/support/${article.topic}/${article.slug}`}
                    className="group flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-stone-50"
                  >
                    <span className="text-sm text-stone-700 transition-colors group-hover:text-orange-600">
                      {article.title}
                    </span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-stone-300 transition-colors group-hover:text-orange-500" />
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          <div>
            <p className="mb-4 text-sm text-stone-500">
              {filteredArticles.length} result{filteredArticles.length !== 1 ? "s" : ""}
              {" "}for <span className="font-medium text-stone-800">&quot;{search}&quot;</span>
            </p>
            {filteredArticles.length > 0 ? (
              <div className="divide-y divide-stone-100 rounded-2xl border border-stone-100 bg-white">
                {filteredArticles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/support/${article.topic}/${article.slug}`}
                    className="group flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-stone-50"
                  >
                    <span className="text-sm text-stone-700 transition-colors group-hover:text-orange-600">
                      {article.title}
                    </span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-stone-300 transition-colors group-hover:text-orange-500" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-14 text-center">
                <p className="mb-3 text-stone-500">No articles found for that search.</p>
                <a href="mailto:support@tagloom.app" className="text-sm font-medium text-orange-600 hover:underline">
                  Contact support directly 2192
                </a>
              </div>
            )}
          </div>
        )}

        <div className="mt-14 flex flex-col items-start justify-between gap-5 rounded-2xl border border-stone-100 bg-white p-7 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100">
              <Mail className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-stone-900">Still need help?</h3>
              <p className="text-sm text-stone-500">
                Our support team typically responds within a few hours on weekdays.
              </p>
            </div>
          </div>
          <a
            href="mailto:support@tagloom.app"
            className="flex-shrink-0 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              boxShadow: "0 3px 14px rgba(249,115,22,0.3)",
            }}
          >
            Email Support
          </a>
        </div>
      </div>

      <footer className="mt-8 border-t border-stone-200 bg-white px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <BrandMark href="/" size="footer" />
          <div className="flex items-center gap-7 text-sm text-stone-400">
            <a href="#" className="transition-colors hover:text-stone-700">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-stone-700">
              Terms
            </a>
          </div>
          <p className="text-xs text-stone-400">© 2026 Tagloom. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
