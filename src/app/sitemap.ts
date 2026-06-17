import type { MetadataRoute } from "next";
import { listBlogPosts } from "@/content/blog";
import { listSupportArticles, listSupportTopics } from "@/content/support";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tagloom.app";
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    createEntry(siteUrl, "/", now, "weekly", 1),
    createEntry(siteUrl, "/blog", now, "weekly", 0.8),
    ...listBlogPosts().map((post) =>
      createEntry(siteUrl, `/blog/${post.slug}`, now, "monthly", 0.7),
    ),
    createEntry(siteUrl, "/support", now, "weekly", 0.8),
    ...listSupportTopics().map((topic) =>
      createEntry(siteUrl, `/support/${topic.slug}`, now, "monthly", 0.7),
    ),
    ...listSupportArticles().map((article) =>
      createEntry(
        siteUrl,
        `/support/${article.topic}/${article.slug}`,
        now,
        "monthly",
        0.6,
      ),
    ),
    createEntry(siteUrl, "/support/contact", now, "monthly", 0.6),
    createEntry(siteUrl, "/privacy", now, "yearly", 0.3),
    createEntry(siteUrl, "/terms", now, "yearly", 0.3),
  ];

  return entries;
}

function createEntry(
  siteUrl: string,
  path: string,
  lastModified: Date,
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority?: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${path}`,
    lastModified,
    ...(changeFrequency ? { changeFrequency } : {}),
    ...(priority !== undefined ? { priority } : {}),
  };
}
