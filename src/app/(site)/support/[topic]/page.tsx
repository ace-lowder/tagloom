import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SupportTopicPage from "@/components/support/SupportTopicPage";
import { getSupportTopicBySlug, listSupportArticlesByTopic } from "@/content/support";

type SupportTopicRouteProps = {
  params: {
    topic: string;
  };
};

export default function SupportTopicRoute({ params }: SupportTopicRouteProps) {
  const topic = getSupportTopicBySlug(params.topic);
  if (!topic) {
    notFound();
  }

  return <SupportTopicPage topic={topic} articles={listSupportArticlesByTopic(topic.slug)} />;
}

export async function generateMetadata({
  params,
}: SupportTopicRouteProps): Promise<Metadata> {
  const topic = getSupportTopicBySlug(params.topic);
  if (!topic) {
    notFound();
  }

  return {
    title: topic.name,
  };
}
