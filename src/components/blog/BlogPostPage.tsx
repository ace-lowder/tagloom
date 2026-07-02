"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar } from "lucide-react";
import { DEFAULT_BLOG_BOTTOM_CTA } from "@/content/blogDefaults";
import type { BlogPost } from "@/content/blog";
import SiteFooter from "@/components/shared/SiteFooter";
import { triggerGeneratorCta } from "@/lib/generatorCta";

type BlogPostPageProps = {
  post: BlogPost;
};

type TableOfContentsProps = {
  sections: BlogPost["sections"];
  activeId: string;
};

type TocAnchor = {
  id: string;
  top: number;
};

const BLOG_OVERVIEW_ID = "post-overview";
const BLOG_TOC_SCROLL_OFFSET = 104;
const BLOG_ACTIVE_MARKER_VIEWPORT_RATIO = 0.5;
const blogNavLinkClass =
  "flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-orange-600";
const ctaButtonClass =
  "inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_3px_14px_rgba(249,115,22,0.3)] transition-all hover:from-orange-600 hover:to-orange-700";

export default function BlogPostPage({ post }: BlogPostPageProps) {
  const [activeId, setActiveId] = useState("");
  const router = useRouter();
  const tocSections = useMemo(
    () => [{ id: BLOG_OVERVIEW_ID, level: 2 as const, title: post.title }, ...post.sections],
    [post.sections, post.title],
  );
  const tocSectionIds = useMemo(
    () => tocSections.map((section) => section.id),
    [tocSections],
  );
  const cta = post.bottomCta ?? DEFAULT_BLOG_BOTTOM_CTA;

  const handleCtaClick = () => {
    triggerGeneratorCta({
      isHomePage: false,
      navigateHome: () => router.push("/"),
      requestReset: true,
    });
  };

  useEffect(() => {
    const updateActiveHeading = () => {
      const anchors = collectTocAnchors(tocSectionIds);
      const marker =
        window.scrollY + window.innerHeight * BLOG_ACTIVE_MARKER_VIEWPORT_RATIO;
      const nextActiveId = getActiveSectionId(anchors, marker);
      if (!nextActiveId) return;
      setActiveId((prev) => (prev === nextActiveId ? prev : nextActiveId));
    };

    updateActiveHeading();
    let timeoutId: number | undefined;
    const rafId = window.requestAnimationFrame(() => {
      timeoutId = window.setTimeout(updateActiveHeading, 120);
    });

    window.addEventListener("scroll", updateActiveHeading, { passive: true });
    window.addEventListener("resize", updateActiveHeading);

    return () => {
      window.cancelAnimationFrame(rafId);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener("scroll", updateActiveHeading);
      window.removeEventListener("resize", updateActiveHeading);
    };
  }, [post.slug, tocSectionIds]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <ReadingProgress />

      <div className="mx-auto max-w-6xl px-5 py-12 pt-24">
        <Link href="/blog" className={`mb-8 ${blogNavLinkClass}`}>
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        <div className="flex gap-12">
          <aside className="hidden w-56 flex-shrink-0 lg:block">
            <div className="sticky top-24">
              <TableOfContents sections={tocSections} activeId={activeId} />
            </div>
          </aside>

          <main className="min-w-0 max-w-2xl flex-1">
            <div id={BLOG_OVERVIEW_ID} />
            <div className="mb-8">
              <h1 className="mb-4 text-3xl font-bold leading-tight text-stone-900 sm:text-4xl">
                {post.title}
              </h1>
              <div className="flex items-center gap-5 text-sm text-stone-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {post.date}
                </span>
                <span>{post.readTime}</span>
              </div>
            </div>

            {post.heroImage ? (
              <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
                <Image
                  src={post.heroImage}
                  alt={post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 720px"
                  placeholder="blur"
                />
              </div>
            ) : null}

            <div className="prose-content prose-blog" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

            <section className="mt-12 rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 sm:p-7">
              <h2 className="mb-2 text-2xl font-bold leading-tight text-stone-900 sm:text-[1.75rem]">
                {cta.heading}
              </h2>
              <p className="mb-5 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
                {cta.body}
              </p>
              <button type="button" onClick={handleCtaClick} className={ctaButtonClass}>
                {cta.buttonLabel}
              </button>
            </section>

            <div className="mt-14 flex items-center justify-between border-t border-stone-200 pt-8">
              <Link href="/blog" className={blogNavLinkClass}>
                <ArrowLeft className="h-4 w-4" />
                All articles
              </Link>
            </div>
          </main>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      setProgress(scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] h-1 bg-stone-200">
      <motion.div
        className="h-full origin-left"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, #f97316, #ea580c)",
        }}
        transition={{ duration: 0.1 }}
      />
    </div>
  );
}

function TableOfContents({ sections, activeId }: TableOfContentsProps) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const top =
      el.getBoundingClientRect().top + window.scrollY - BLOG_TOC_SCROLL_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <nav className="space-y-1">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
        Contents
      </p>
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => scrollTo(section.id)}
          className={`block w-full py-1 text-left text-sm transition-colors ${section.level === 3 ? "pl-4" : ""} ${
            activeId === section.id
              ? "font-medium text-orange-600"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          {section.title}
        </button>
      ))}
    </nav>
  );
}

function collectTocAnchors(ids: string[]): TocAnchor[] {
  const anchors: TocAnchor[] = [];

  for (const id of ids) {
    const element = document.getElementById(id);
    if (!element) continue;
    anchors.push({
      id,
      top: element.getBoundingClientRect().top + window.scrollY,
    });
  }

  return anchors;
}

function getActiveSectionId(anchors: TocAnchor[], marker: number): string | null {
  if (!anchors.length) return null;

  const firstAnchor = anchors[0];
  const lastAnchor = anchors[anchors.length - 1];
  if (marker < firstAnchor.top) return firstAnchor.id;
  if (marker >= lastAnchor.top) return lastAnchor.id;

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const current = anchors[i];
    const next = anchors[i + 1];
    if (marker >= current.top && marker < next.top) {
      return current.id;
    }
  }

  return firstAnchor.id;
}
