import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SupportArticlePage from "@/components/support/SupportArticlePage";
import {
  getSupportArticleByTopicAndSlug,
  getSupportTopicBySlug,
  listSupportArticles,
  listSupportTopics,
} from "@/content/support";

type SupportArticleRouteProps = {
  params: {
    topic: string;
    slug: string;
  };
};

export default function SupportArticleRoute({ params }: SupportArticleRouteProps) {
  const topic = getSupportTopicBySlug(params.topic);
  if (!topic) {
    notFound();
  }

  const article = getSupportArticleByTopicAndSlug(params.topic, params.slug);
  if (!article) {
    notFound();
  }

  return (
    <SupportArticlePage
      article={article}
      topicName={topic.name}
      allTopics={listSupportTopics()}
      allArticles={listSupportArticles()}
    />
  );
}

export async function generateMetadata({
  params,
}: SupportArticleRouteProps): Promise<Metadata> {
  const topic = getSupportTopicBySlug(params.topic);
  if (!topic) {
    notFound();
  }

  const article = getSupportArticleByTopicAndSlug(params.topic, params.slug);
  if (!article) {
    notFound();
  }

  return {
    title: article.title,
  };
}
