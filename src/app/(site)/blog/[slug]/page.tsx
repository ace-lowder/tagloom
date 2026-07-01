import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostPage from "@/components/blog/BlogPostPage";
import { getBlogPostBySlug } from "@/content/blog";

type BlogPostRouteProps = {
  params: {
    slug: string;
  };
};

export default function BlogPostRoute({ params }: BlogPostRouteProps) {
  const post = getBlogPostBySlug(params.slug);
  if (!post) {
    notFound();
  }

  return <BlogPostPage post={post} />;
}

export async function generateMetadata({
  params,
}: BlogPostRouteProps): Promise<Metadata> {
  const post = getBlogPostBySlug(params.slug);
  if (!post) {
    notFound();
  }

  return {
    title: post.title,
  };
}
