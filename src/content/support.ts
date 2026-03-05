export type SupportIconKey =
  | "user"
  | "credit-card"
  | "sparkles"
  | "rotate-ccw"
  | "tag"
  | "help-circle";

export type SupportTopic = {
  slug: string;
  icon: SupportIconKey;
  name: string;
  description: string;
  color: string;
};

export type SupportArticle = {
  slug: string;
  topic: string;
  title: string;
  contentHtml: string;
  relatedSlugs: string[];
};

export const SUPPORT_TOPICS: SupportTopic[] = [
  {
    slug: "account",
    icon: "user",
    name: "Account & Profile",
    description: "Managing your account, login issues, and profile settings.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    slug: "billing",
    icon: "credit-card",
    name: "Billing & Payments",
    description: "Subscription plans, invoices, payment methods, and charges.",
    color: "bg-green-100 text-green-600",
  },
  {
    slug: "tag-generation",
    icon: "sparkles",
    name: "Tag Generation",
    description: "How Tagloom generates tags, accuracy, and best practices.",
    color: "bg-orange-100 text-orange-600",
  },
  {
    slug: "refunds",
    icon: "rotate-ccw",
    name: "Refunds",
    description: "Refund eligibility, requests, and processing times.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    slug: "using-tagsy",
    icon: "tag",
    name: "Using Tagloom",
    description: "Step-by-step guides for getting the most out of Tagloom.",
    color: "bg-pink-100 text-pink-600",
  },
  {
    slug: "general",
    icon: "help-circle",
    name: "General Questions",
    description: "Integrations, feature requests, and general product questions.",
    color: "bg-stone-100 text-stone-600",
  },
];

export const SUPPORT_ARTICLES: SupportArticle[] = [
  {
    slug: "reset-password",
    topic: "account",
    title: "How do I reset my password?",
    contentHtml: `
      <h2>Resetting your password</h2>
      <p>If you've forgotten your Tagloom password or simply want to change it, resetting is quick and easy.</p>
      <h3>Steps to reset your password</h3>
      <ol>
        <li>Go to the Tagloom login page.</li>
        <li>Click <strong>Forgot password?</strong>.</li>
        <li>Enter your account email address.</li>
        <li>Open the reset email and follow the link.</li>
        <li>Create and save your new password.</li>
      </ol>
      <div class="callout"><strong>Didn't receive the email?</strong> Check spam and then contact support if needed.</div>
    `,
    relatedSlugs: ["how-tags-work", "monthly-plan", "copy-tags"],
  },
  {
    slug: "how-tags-work",
    topic: "tag-generation",
    title: "How does the tag generation work?",
    contentHtml: `
      <h2>How Tagloom generates tags</h2>
      <p>Tagloom analyzes your listing title and optional description, then returns a full set of Etsy-ready tags designed for buyer intent and discovery coverage.</p>
      <h3>What the model considers</h3>
      <ul>
        <li>Listing language and specificity</li>
        <li>Likely buyer search behavior</li>
        <li>Tag uniqueness and phrase quality</li>
      </ul>
      <div class="callout"><strong>Tip:</strong> Add description context for stronger niche outputs.</div>
    `,
    relatedSlugs: ["copy-tags", "tags-not-ranking", "monthly-plan"],
  },
  {
    slug: "refund-policy",
    topic: "refunds",
    title: "Can I get a refund if I'm not satisfied?",
    contentHtml: `
      <h2>Refund policy</h2>
      <p>We want you confident in Tagloom. Refund windows depend on plan type and purchase timing.</p>
      <h3>Monthly plans</h3>
      <p>Eligible for full refund within 7 days of billing date.</p>
      <h3>Yearly plans</h3>
      <p>Eligible for full refund within 14 days of purchase.</p>
      <div class="callout">Email support@tagloom.app with account email and payment details for refund review.</div>
    `,
    relatedSlugs: ["monthly-plan", "reset-password"],
  },
  {
    slug: "monthly-plan",
    topic: "billing",
    title: "What is included in the Monthly plan?",
    contentHtml: `
      <h2>Monthly plan features</h2>
      <ul>
        <li>Unlimited generations</li>
        <li>Full 13-tag outputs</li>
        <li>One-click copy</li>
        <li>Priority support</li>
      </ul>
      <p>You can cancel anytime and keep access through the billing period end.</p>
    `,
    relatedSlugs: ["refund-policy", "reset-password", "how-tags-work"],
  },
  {
    slug: "copy-tags",
    topic: "using-tagsy",
    title: "How do I copy all generated tags at once?",
    contentHtml: `
      <h2>Copy all generated tags</h2>
      <p>Use the <strong>Copy All</strong> action in the generator output area to copy the current tag set instantly.</p>
      <div class="callout"><strong>Etsy tip:</strong> Paste into individual tag slots or your editor's bulk input if available.</div>
    `,
    relatedSlugs: ["how-tags-work", "tags-not-ranking"],
  },
  {
    slug: "tags-not-ranking",
    topic: "tag-generation",
    title: "Why are my tags not showing up in Etsy search?",
    contentHtml: `
      <h2>Why tags may take time to rank</h2>
      <p>Tag updates need indexing time. Allow 2-4 weeks before evaluating changes.</p>
      <h3>Common blockers</h3>
      <ul>
        <li>Weak listing quality signals</li>
        <li>Title/tag overlap without new coverage</li>
        <li>Insufficient niche specificity</li>
      </ul>
      <div class="callout"><strong>Use Etsy stats</strong> to measure which queries are driving visits and conversions.</div>
    `,
    relatedSlugs: ["how-tags-work", "copy-tags", "monthly-plan"],
  },
];

export function listSupportTopics(): SupportTopic[] {
  return SUPPORT_TOPICS;
}

export function getSupportTopicBySlug(slug: string): SupportTopic | undefined {
  return SUPPORT_TOPICS.find((topic) => topic.slug === slug);
}

export function listSupportArticles(): SupportArticle[] {
  return SUPPORT_ARTICLES;
}

export function getSupportArticleBySlug(slug: string): SupportArticle | undefined {
  return SUPPORT_ARTICLES.find((article) => article.slug === slug);
}

export function getSupportArticleByTopicAndSlug(topic: string, slug: string): SupportArticle | undefined {
  return SUPPORT_ARTICLES.find(
    (article) => article.topic === topic && article.slug === slug,
  );
}

export function listSupportArticlesByTopic(topic: string): SupportArticle[] {
  return SUPPORT_ARTICLES.filter((article) => article.topic === topic);
}
