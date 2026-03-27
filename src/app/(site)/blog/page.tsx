import BlogIndexPage from "@/components/blog/BlogIndexPage";
import { listBlogPosts } from "@/content/blog";

export default function BlogPage() {
  return <BlogIndexPage posts={listBlogPosts()} />;
}
