import type { Metadata } from "next";
import BlogIndexPage from "@/components/blog/BlogIndexPage";
import { listBlogPosts } from "@/content/blog";

export const metadata: Metadata = {
  title: "Blog",
};

export default function BlogPage() {
  return <BlogIndexPage posts={listBlogPosts()} />;
}
