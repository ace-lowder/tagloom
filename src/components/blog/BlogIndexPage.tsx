"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, User } from "lucide-react";
import type { BlogPost } from "@/content/blog";
import SiteFooter from "@/components/shared/SiteFooter";

const categoryColors: Record<string, string> = {
  SEO: "bg-orange-100 text-orange-700",
  Strategy: "bg-purple-100 text-purple-700",
  Tips: "bg-green-100 text-green-700",
  Research: "bg-blue-100 text-blue-700",
};

const fadeInUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

type BlogIndexPageProps = {
  posts: BlogPost[];
};

export default function BlogIndexPage({ posts }: BlogIndexPageProps) {
  const [featured, ...rest] = posts;

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <section className="border-b border-stone-100 bg-white px-5 pb-16 pt-28">
        <div className="mx-auto max-w-5xl">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.p
              variants={fadeInUp}
              className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600"
            >
              Tagloom Blog
            </motion.p>
            <motion.h1
              variants={fadeInUp}
              className="mb-3 text-4xl font-bold text-stone-900 sm:text-5xl"
            >
              Insights for Etsy Sellers
            </motion.h1>
            <motion.p variants={fadeInUp} className="max-w-xl text-lg text-stone-500">
              Practical guides on tags, SEO, and growing your Etsy shop with AI.
            </motion.p>
          </motion.div>

          {featured ? (
            <motion.article variants={fadeInUp} initial="hidden" animate="visible" className="mt-10">
              <Link
                href={`/blog/${featured.slug}`}
                className="group grid overflow-hidden rounded-3xl border border-stone-200 bg-white transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg lg:grid-cols-[1.2fr_1fr]"
              >
                <div className="p-7 sm:p-9">
                  <div className="mb-3 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryColors[featured.category] || "bg-stone-100 text-stone-600"}`}
                    >
                      Featured
                    </span>
                    <span className="text-xs text-stone-400">{featured.readTime}</span>
                  </div>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h2 className="text-2xl font-bold leading-tight text-stone-900 transition-colors group-hover:text-orange-600 sm:text-3xl">
                      {featured.title}
                    </h2>
                    <span className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 transition-colors group-hover:bg-orange-100">
                      <ArrowRight className="h-4 w-4 text-stone-400 transition-colors group-hover:text-orange-600" />
                    </span>
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-stone-600 sm:text-base">
                    {featured.excerpt} Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  </p>
                  <div className="flex items-center gap-4 text-xs text-stone-400">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {featured.author}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {featured.date}
                    </span>
                  </div>
                </div>

                <div className="relative min-h-[260px] lg:min-h-full">
                  <Image
                    src="/blog-feature-placeholder.svg"
                    alt="Featured article"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                </div>
              </Link>
            </motion.article>
          ) : null}
        </div>
      </section>

      <section className="px-5 py-16">
        <div className="mx-auto max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="grid gap-6">
            {rest.map((post) => (
              <motion.article key={post.slug} variants={fadeInUp}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block cursor-pointer rounded-2xl border border-stone-100 bg-white p-6 transition-all hover:border-orange-200 hover:shadow-md sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-3 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryColors[post.category] || "bg-stone-100 text-stone-600"}`}
                        >
                          {post.category}
                        </span>
                        <span className="text-xs text-stone-400">{post.readTime}</span>
                      </div>
                      <h2 className="mb-2 text-xl font-bold leading-snug text-stone-900 transition-colors group-hover:text-orange-600">
                        {post.title}
                      </h2>
                      <p className="mb-4 text-sm leading-relaxed text-stone-500">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-stone-400">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {post.author}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {post.date}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 flex-shrink-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 transition-colors group-hover:bg-orange-100">
                        <ArrowRight className="h-4 w-4 text-stone-400 transition-colors group-hover:text-orange-600" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
