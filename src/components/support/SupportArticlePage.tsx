"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Mail,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import type { SupportArticle, SupportTopic } from "@/content/support";
import SiteFooter from "@/components/shared/SiteFooter";

type SupportArticlePageProps = {
  article: SupportArticle;
  topicName: string;
  allTopics: SupportTopic[];
  allArticles: SupportArticle[];
};

export default function SupportArticlePage({
  article,
  topicName,
  allTopics,
  allArticles,
}: SupportArticlePageProps) {
  const [helpful, setHelpful] = useState<boolean | null>(null);

  const relatedArticles = useMemo(
    () =>
      article.relatedSlugs
        .map((slug) => allArticles.find((item) => item.slug === slug))
        .filter((item): item is SupportArticle => Boolean(item)),
    [article.relatedSlugs, allArticles],
  );

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <div className="mx-auto max-w-5xl px-5 py-12 pt-24">
        <Link
          href="/support"
          className="mb-8 flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-orange-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Help Center
        </Link>

        <div className="flex gap-10">
          <main className="min-w-0 flex-1">
            <div className="mb-6 rounded-2xl border border-stone-100 bg-white p-8">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-orange-600">
                {topicName}
              </p>
              <h1 className="mb-8 text-2xl font-bold leading-snug text-stone-900 sm:text-3xl">
                {article.title}
              </h1>

              <div className="prose-tagsy" dangerouslySetInnerHTML={{ __html: article.contentHtml }} />

              <div className="mt-10 border-t border-stone-100 pt-6">
                <p className="mb-3 text-sm font-medium text-stone-700">Was this article helpful?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setHelpful(true)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                      helpful === true
                        ? "border-green-400 bg-green-50 text-green-700"
                        : "border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    <ThumbsUp className="h-4 w-4" /> Yes
                  </button>
                  <button
                    onClick={() => setHelpful(false)}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                      helpful === false
                        ? "border-red-300 bg-red-50 text-red-600"
                        : "border-stone-200 text-stone-600 hover:border-stone-300"
                    }`}
                  >
                    <ThumbsDown className="h-4 w-4" /> No
                  </button>
                </div>
                {helpful !== null ? (
                  <p className="mt-3 text-sm text-stone-500">
                    {helpful ? (
                      "Glad it helped!"
                    ) : (
                      <>
                        Still stuck?{" "}
                        <Link href="/support/contact" className="text-orange-600 hover:underline">
                          Contact support
                        </Link>
                        .
                      </>
                    )}
                  </p>
                ) : null}
              </div>
            </div>

            {relatedArticles.length > 0 ? (
              <div className="rounded-2xl border border-stone-100 bg-white p-6">
                <h2 className="mb-4 text-base font-semibold text-stone-800">Related articles</h2>
                <div className="space-y-1">
                  {relatedArticles.map((related) => (
                    <Link
                      key={related.slug}
                      href={`/support/${related.topic}/${related.slug}`}
                      className="group flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-stone-50"
                    >
                      <span className="text-sm text-stone-700 transition-colors group-hover:text-orange-600">
                        {related.title}
                      </span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-transparent transition-colors group-hover:bg-orange-100">
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-stone-400 transition-colors group-hover:text-orange-600" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </main>

          <aside className="hidden w-56 flex-shrink-0 lg:block">
            <div className="sticky top-24 space-y-5">
              <div className="rounded-2xl border border-stone-100 bg-white p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">Topics</p>
                <div className="space-y-1">
                  {allTopics.map((topic) => (
                    <Link
                      key={topic.slug}
                      href={`/support/${topic.slug}`}
                      className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-stone-50 ${
                        article.topic === topic.slug
                          ? "bg-orange-50 font-medium text-orange-600"
                          : "text-stone-600"
                      }`}
                    >
                      {topic.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-stone-100 bg-white p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
                  <Mail className="h-4 w-4 text-orange-600" />
                </div>
                <p className="mb-1 text-sm font-semibold text-stone-800">Need more help?</p>
                <p className="mb-3 text-xs leading-relaxed text-stone-500">
                  Our team replies within a few hours.
                </p>
                <Link
                  href="/support/contact"
                  className="block rounded-lg py-2.5 text-center text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-orange-500/25"
                  style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}
                >
                  Email Support
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
