"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, Mail } from "lucide-react";
import type { SupportArticle, SupportTopic } from "@/content/support";
import SiteFooter from "@/components/shared/SiteFooter";

type SupportTopicPageProps = {
  topic: SupportTopic;
  articles: SupportArticle[];
};

export default function SupportTopicPage({ topic, articles }: SupportTopicPageProps) {
  return (
    <div className="min-h-screen bg-stone-50 font-sans">
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
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent transition-colors group-hover:bg-orange-100">
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-stone-400 transition-colors group-hover:text-orange-600" />
                </span>
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
            className="flex-shrink-0 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/25"
            style={{
              background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              boxShadow: "0 3px 14px rgba(249,115,22,0.3)",
            }}
          >
            Email Support
          </a>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
