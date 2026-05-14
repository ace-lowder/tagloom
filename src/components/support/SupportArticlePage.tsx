"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Mail,
} from "lucide-react";
import FeedbackButtons, { type FeedbackRating } from "@/components/feedback/FeedbackButtons";
import FeedbackModal from "@/components/feedback/FeedbackModal";
import type { SupportArticle, SupportTopic } from "@/content/support";
import SiteFooter from "@/components/shared/SiteFooter";
import { toastMessages } from "@/components/toasts/toastMessages";
import { useToast } from "@/components/toasts/toasts";
import { ButtonLink } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  const { showToast } = useToast();
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [feedback, setFeedback] = useState<{
    rating: FeedbackRating;
    note: string | null;
  } | null>(null);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [isDownvoteModalOpen, setIsDownvoteModalOpen] = useState(false);
  const downvotePreviousFeedbackRef = useRef<{
    rating: FeedbackRating;
    note: string | null;
  } | null>(null);

  const relatedArticles = useMemo(
    () =>
      article.relatedSlugs
        .map((slug) => allArticles.find((item) => item.slug === slug))
        .filter((item): item is SupportArticle => Boolean(item)),
    [article.relatedSlugs, allArticles],
  );

  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      setIsAuthenticated(Boolean(data.user));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveFeedback = async (rating: FeedbackRating, note?: string) => {
    setIsSavingFeedback(true);
    try {
      const response = await fetch("/api/feedback/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          articleSlug: article.slug,
          rating,
          note,
        }),
      });
      if (!response.ok) {
        throw new Error("Could not save article feedback.");
      }
      const data = (await response.json().catch(() => ({}))) as {
        feedback?: { rating: FeedbackRating; note: string | null };
      };
      setFeedback(data.feedback ?? { rating, note: rating === "up" ? null : note ?? null });
      showToast(toastMessages.articleFeedbackSaved);
    } catch {
      showToast(toastMessages.articleFeedbackFailed);
      throw new Error("Article feedback save failed");
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const clearFeedback = async () => {
    setIsSavingFeedback(true);
    try {
      const response = await fetch("/api/feedback/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clear",
          articleSlug: article.slug,
        }),
      });
      if (!response.ok) {
        throw new Error("Could not clear article feedback.");
      }
      setFeedback(null);
    } catch {
      showToast(toastMessages.articleFeedbackFailed);
      throw new Error("Article feedback clear failed");
    } finally {
      setIsSavingFeedback(false);
    }
  };

  const onThumbsUp = async () => {
    if (!isAuthenticated) {
      setHelpful(true);
      return;
    }

    const previous = feedback;
    if (feedback?.rating === "up") {
      setFeedback(null);
      try {
        await clearFeedback();
      } catch {
        setFeedback(previous);
      }
      return;
    }

    setFeedback({ rating: "up", note: null });
    try {
      await saveFeedback("up");
    } catch {
      setFeedback(previous);
    }
  };

  const onThumbsDown = async () => {
    if (!isAuthenticated) {
      setHelpful(false);
      return;
    }

    const previous = feedback;
    if (feedback?.rating === "down") {
      setFeedback(null);
      try {
        await clearFeedback();
      } catch {
        setFeedback(previous);
      }
      return;
    }

    setFeedback({ rating: "down", note: null });
    downvotePreviousFeedbackRef.current = previous;
    setIsDownvoteModalOpen(true);
  };

  const submitDownvote = async (note: string) => {
    const previous = downvotePreviousFeedbackRef.current ?? feedback;
    try {
      await saveFeedback("down", note);
    } catch {
      setFeedback(previous);
    } finally {
      downvotePreviousFeedbackRef.current = null;
    }
  };

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

              <div className="prose-content" dangerouslySetInnerHTML={{ __html: article.contentHtml }} />

              <div className="mt-10 border-t border-stone-100 pt-6">
                <p className="mb-3 text-sm font-medium text-stone-700">Was this article helpful?</p>
                <FeedbackButtons
                  rating={isAuthenticated ? feedback?.rating ?? null : helpful === null ? null : helpful ? "up" : "down"}
                  disabled={isSavingFeedback}
                  onUp={() => {
                    void onThumbsUp();
                  }}
                  onDown={() => {
                    void onThumbsDown();
                  }}
                />
                {!isAuthenticated && helpful !== null ? (
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
                <ButtonLink
                  href="/support/contact"
                  size="sm"
                  className="w-full rounded-lg py-2.5 text-xs"
                >
                  Email Support
                </ButtonLink>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <SiteFooter />
      <FeedbackModal
        open={isDownvoteModalOpen}
        title="Tell us what went wrong"
        placeholder="Please tell us what was unhelpful so we can improve this article."
        isSubmitting={isSavingFeedback}
        initialNote={feedback?.rating === "down" ? feedback.note : ""}
        onCloseWithoutNote={() => {
          setIsDownvoteModalOpen(false);
          void submitDownvote("");
        }}
        onSubmit={(note) => {
          setIsDownvoteModalOpen(false);
          void submitDownvote(note);
        }}
      />
    </div>
  );
}
