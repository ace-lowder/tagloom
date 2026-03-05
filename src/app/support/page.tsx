import SupportHubPage from "@/components/support/SupportHubPage";
import { listSupportArticles, listSupportTopics } from "@/content/support";

export default function SupportPage() {
  return <SupportHubPage topics={listSupportTopics()} articles={listSupportArticles()} />;
}
