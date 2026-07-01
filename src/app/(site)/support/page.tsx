import type { Metadata } from "next";
import SupportHubPage from "@/components/support/SupportHubPage";
import { listSupportArticles, listSupportTopics } from "@/content/support";

export const metadata: Metadata = {
  title: "Support",
};

export default function SupportPage() {
  return <SupportHubPage topics={listSupportTopics()} articles={listSupportArticles()} />;
}
