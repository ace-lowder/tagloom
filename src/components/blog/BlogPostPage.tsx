"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar } from "lucide-react";
import type { BlogPost } from "@/content/blog";
import SiteFooter from "@/components/shared/SiteFooter";

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

type TableOfContentsProps = {
  sections: BlogPost["sections"];
  activeId: string;
};

const BLOG_TOC_SCROLL_OFFSET = 104;

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

type BlogPostPageProps = {
  post: BlogPost;
};

export default function BlogPostPage({ post }: BlogPostPageProps) {
  const [activeId, setActiveId] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const headings = Array.from(
      contentRef.current?.querySelectorAll<HTMLElement>("h2[id], h3[id]") || [],
    );
    if (!headings.length) return;

    const updateActiveHeading = () => {
      const scrollMarker = BLOG_TOC_SCROLL_OFFSET + 8;
      const passedHeadings = headings.filter(
        (heading) => heading.getBoundingClientRect().top <= scrollMarker,
      );

      if (passedHeadings.length > 0) {
        setActiveId(passedHeadings[passedHeadings.length - 1].id);
        return;
      }

      const firstVisible = headings.find(
        (heading) => heading.getBoundingClientRect().top > scrollMarker,
      );

      setActiveId(firstVisible?.id || headings[0].id);
    };

    updateActiveHeading();
    window.addEventListener("scroll", updateActiveHeading, { passive: true });
    window.addEventListener("resize", updateActiveHeading);

    return () => {
      window.removeEventListener("scroll", updateActiveHeading);
      window.removeEventListener("resize", updateActiveHeading);
    };
  }, [post.slug]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <ReadingProgress />

      <div className="mx-auto max-w-6xl px-5 py-12 pt-24">
        <Link
          href="/blog"
          className="mb-8 flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-orange-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        <div className="flex gap-12">
          <aside className="hidden w-56 flex-shrink-0 lg:block">
            <div className="sticky top-24">
              <TableOfContents sections={post.sections} activeId={activeId} />
            </div>
          </aside>

          <main className="min-w-0 max-w-2xl flex-1">
            <div className="mb-8">
              <span className="mb-3 block text-xs font-semibold uppercase tracking-wide text-orange-600">
                {post.category}
              </span>
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
                />
              </div>
            ) : null}

            <div
              ref={contentRef}
              className="prose-tagsy"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />

            <div className="mt-14 flex items-center justify-between border-t border-stone-200 pt-8">
              <Link
                href="/blog"
                className="flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-orange-600"
              >
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
