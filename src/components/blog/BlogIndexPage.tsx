"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { type BlogCategory, type BlogPost } from "@/content/blog";
import { BLOG_INDEX_GUIDE, BLOG_INDEX_INTRO } from "@/content/blogIndex";
import SiteFooter from "@/components/shared/SiteFooter";

const categoryColors: Record<BlogCategory, string> = {
  SEO: "bg-orange-100 text-orange-700",
  Strategy: "bg-purple-100 text-purple-700",
  Tips: "bg-green-100 text-green-700",
  Research: "bg-blue-100 text-blue-700",
};
const categoryBadgeClass = "rounded-full px-2.5 py-1 text-xs font-semibold";
const featuredMetaClass = "mb-3 flex items-center gap-2";
const dateMetaClass = "flex items-center gap-4 text-xs text-stone-400";
const dateRowClass = "flex items-center gap-1.5";
const cardArrowClass =
  "h-4 w-4 text-stone-400 transition-colors group-hover:text-orange-600";

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
      <BlogHero featured={featured} />
      <BlogGuideSection />
      <BlogPostList posts={rest} />
      <SiteFooter />
    </div>
  );
}

type BlogHeroProps = {
  featured?: BlogPost;
};

function BlogHero({ featured }: BlogHeroProps) {
  return (
    <section className="border-b border-stone-100 bg-white px-5 pb-16 pt-28">
      <div className="mx-auto max-w-5xl">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.p
            variants={fadeInUp}
            className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600"
          >
            {BLOG_INDEX_INTRO.eyebrow}
          </motion.p>
          <motion.h1
            variants={fadeInUp}
            className="mb-3 text-4xl font-bold text-stone-900 sm:text-5xl"
          >
            {BLOG_INDEX_INTRO.heading}
          </motion.h1>
          <motion.p variants={fadeInUp} className="max-w-xl text-lg text-stone-500">
            {BLOG_INDEX_INTRO.body}
          </motion.p>
        </motion.div>

        {featured ? <FeaturedPostCard post={featured} /> : null}
      </div>
    </section>
  );
}

type FeaturedPostCardProps = {
  post: BlogPost;
};

function FeaturedPostCard({ post }: FeaturedPostCardProps) {
  return (
    <motion.article variants={fadeInUp} initial="hidden" animate="visible" className="mt-10">
      <Link
        href={`/blog/${post.slug}`}
        className="group grid overflow-hidden rounded-3xl border border-stone-200 bg-white transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg lg:grid-cols-[1.2fr_1fr]"
      >
        <div className="p-7 sm:p-9">
          <div className={featuredMetaClass}>
            <span className={`${categoryBadgeClass} ${categoryColors[post.category]}`}>
              Featured
            </span>
            <span className="text-xs text-stone-400">{post.readTime}</span>
          </div>
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="text-2xl font-bold leading-tight text-stone-900 transition-colors group-hover:text-orange-600 sm:text-3xl">
              {post.title}
            </h2>
            <span className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-stone-100 transition-colors group-hover:bg-orange-100">
              <ArrowRight className={cardArrowClass} />
            </span>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-stone-600 sm:text-base">
            {post.excerpt}
          </p>
          <div className={dateMetaClass}>
            <span className={dateRowClass}>
              <Calendar className="h-3.5 w-3.5" />
              {post.date}
            </span>
          </div>
        </div>

        <div className="relative min-h-[260px] lg:min-h-full">
          <Image
            src={post.heroImage || "/blog-feature-placeholder.svg"}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 40vw"
          />
        </div>
      </Link>
    </motion.article>
  );
}

function BlogGuideSection() {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeInUp}
      className="bg-[#ffead6] px-6 py-10 sm:py-12"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-left lg:max-w-5xl lg:text-center">
          <motion.p
            variants={fadeInUp}
            className="mb-2 text-sm font-medium uppercase tracking-wide text-orange-600"
          >
            {BLOG_INDEX_GUIDE.eyebrow}
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl lg:mx-auto lg:max-w-4xl"
          >
            {BLOG_INDEX_GUIDE.heading}
          </motion.h2>
        </div>

        <div className="mx-auto mt-5 max-w-2xl text-left text-base leading-8 text-stone-700 sm:text-lg lg:max-w-5xl">
          <motion.p variants={fadeInUp}>{BLOG_INDEX_GUIDE.body[0]}</motion.p>
          <motion.p variants={fadeInUp} className="mt-4">
            {BLOG_INDEX_GUIDE.body[1]}
          </motion.p>
        </div>

        <div className="mx-auto mt-8 max-w-2xl text-left lg:max-w-5xl">
          <motion.h3 variants={fadeInUp} className="text-xl font-bold text-stone-900 sm:text-2xl">
            {BLOG_INDEX_GUIDE.ctaHeading}
          </motion.h3>
          <motion.p
            variants={fadeInUp}
            className="mt-3 max-w-3xl text-sm leading-relaxed text-stone-600 sm:text-base"
          >
            {BLOG_INDEX_GUIDE.ctaBody}
          </motion.p>
          <motion.div variants={fadeInUp}>
            <Link
              href={BLOG_INDEX_GUIDE.ctaHref}
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 transition-colors hover:text-orange-700"
            >
              {BLOG_INDEX_GUIDE.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

type BlogPostListProps = {
  posts: BlogPost[];
};

function BlogPostList({ posts }: BlogPostListProps) {
  if (!posts.length) {
    return null;
  }

  return (
    <section className="px-5 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl">
            Guides to improve your Etsy listings
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 sm:text-base">
            Pick one area to improve, make the update in Etsy, then compare how the listing
            performs before changing the next thing.
          </p>
        </div>
        <motion.div initial="hidden" animate="visible" variants={stagger} className="grid gap-6">
          {posts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

type BlogPostCardProps = {
  post: BlogPost;
};

function BlogPostCard({ post }: BlogPostCardProps) {
  return (
    <motion.article variants={fadeInUp}>
      <Link
        href={`/blog/${post.slug}`}
        className="group block cursor-pointer rounded-2xl border border-stone-100 bg-white p-6 transition-all hover:border-orange-200 hover:shadow-md sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className={featuredMetaClass}>
              <span className={`${categoryBadgeClass} ${categoryColors[post.category]}`}>
                {post.category}
              </span>
              <span className="text-xs text-stone-400">{post.readTime}</span>
            </div>
            <h2 className="mb-2 text-xl font-bold leading-snug text-stone-900 transition-colors group-hover:text-orange-600">
              {post.title}
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-stone-500">{post.excerpt}</p>
            <div className={dateMetaClass}>
              <span className={dateRowClass}>
                <Calendar className="h-3.5 w-3.5" />
                {post.date}
              </span>
            </div>
          </div>
          <div className="mt-1 flex-shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 transition-colors group-hover:bg-orange-100">
              <ArrowRight className={cardArrowClass} />
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
