"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, Mail } from "lucide-react";
import type { SupportArticle, SupportTopic } from "@/content/support";
import Navbar from "@/components/tagsy/Navbar";
import BrandMark from "@/components/brand/BrandMark";

type SupportTopicPageProps = {
  topic: SupportTopic;
  articles: SupportArticle[];
};

export default function SupportTopicPage({ topic, articles }: SupportTopicPageProps) {
  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <Navbar />

      <div className="mx-auto max-w-3xl px-5 py-12 pt-24">
        <Link
          href="/support"
          className="mb-8 flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-orange-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Help Center
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-stone-900">{topic.name}</h1>
        <p className="mb-10 text-stone-500">{topic.description}</p>

        {articles.length > 0 ? (
          <div className="divide-y divide-stone-100 rounded-2xl border border-stone-100 bg-white">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/support/${topic.slug}/${article.slug}`}
                className="group flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-stone-50"
              >
                <span className="text-sm font-medium text-stone-700 transition-colors group-hover:text-orange-600">
                  {article.title}
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-stone-300 transition-colors group-hover:text-orange-500" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-stone-100 bg-white p-10 text-center">
            <p className="mb-2 text-stone-400">No articles yet for this topic.</p>
            <a href="mailto:support@tagloom.app" className="text-sm font-medium text-orange-600 hover:underline">
              Ask us directly
            </a>
          </div>
        )}

        <div className="mt-8 flex flex-col items-start justify-between gap-5 rounded-2xl border border-stone-100 bg-white p-7 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100">
              <Mail className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-stone-900">Didn&apos;t find your answer?</h3>
              <p className="text-sm text-stone-500">We typically reply within a few hours on weekdays.</p>
            </div>
          </div>
          <a
            href="mailto:support@tagloom.app"
            className="flex-shrink-0 rounded-xl px-5 py-3 text-sm font-semibold text-white"
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
          <p className="text-xs text-stone-400">© 2026 Tagloom. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
