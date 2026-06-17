import type { MetadataRoute } from "next";
import { listBlogPosts } from "@/content/blog";
import { listSupportArticles, listSupportTopics } from "@/content/support";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tagloom.app";
  const blogPosts = listBlogPosts();

  const entries: MetadataRoute.Sitemap = [
    createEntry(siteUrl, "/", "weekly", 1),
    createEntry(siteUrl, "/blog", "weekly", 0.8, blogPostLastModified(blogPosts[0]?.date)),
    ...blogPosts.map((post) =>
      createEntry(siteUrl, `/blog/${post.slug}`, "monthly", 0.7, blogPostLastModified(post.date)),
    ),
    createEntry(siteUrl, "/support", "weekly", 0.8),
    ...listSupportTopics().map((topic) =>
      createEntry(siteUrl, `/support/${topic.slug}`, "monthly", 0.7),
    ),
    ...listSupportArticles().map((article) =>
      createEntry(siteUrl, `/support/${article.topic}/${article.slug}`, "monthly", 0.6),
    ),
    createEntry(siteUrl, "/support/contact", "monthly", 0.6),
    createEntry(siteUrl, "/privacy", "yearly", 0.3),
    createEntry(siteUrl, "/terms", "yearly", 0.3),
  ];

  return entries;
}

function createEntry(
  siteUrl: string,
  path: string,
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority?: number,
  lastModified?: string,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${path}`,
    ...(changeFrequency ? { changeFrequency } : {}),
    ...(priority !== undefined ? { priority } : {}),
    ...(lastModified ? { lastModified } : {}),
  };
}

function blogPostLastModified(date: string | undefined): string | undefined {
  if (!date) return undefined;
  const [month, day, year] = date.split(" ");
  const monthIndex = monthToIndex[month.replace(",", "") as keyof typeof monthToIndex];
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${day.replace(",", "").padStart(2, "0")}T00:00:00.000Z`;
}

const monthToIndex = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
} as const;
