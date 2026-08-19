import { readFileSync } from "fs";
import { join } from "path";

export type SupportIconKey =
  | "user"
  | "credit-card"
  | "sparkles"
  | "rotate-ccw"
  | "tag"
  | "shopping-cart"
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
    slug: "getting-started",
    icon: "rotate-ccw",
    name: "Getting Started",
    description: "Setup, first generation, and launch-day basics.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    slug: "tag-generation",
    icon: "sparkles",
    name: "Tag Generation",
    description:
      "How generation works, output usage, and tag quality improvements.",
    color: "bg-orange-100 text-stone-900",
  },
  {
    slug: "etsy-workflow",
    icon: "shopping-cart",
    name: "Etsy Workflow",
    description: "How to apply tags in listings and track results.",
    color: "bg-amber-100 text-amber-600",
  },
  {
    slug: "account",
    icon: "user",
    name: "Account & Profile",
    description: "Login, password reset, account email, and account settings.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    slug: "billing",
    icon: "credit-card",
    name: "Billing & Payments",
    description: "Plans, checkout issues, invoices, renewals, and refunds.",
    color: "bg-green-100 text-green-600",
  },
  {
    slug: "troubleshooting",
    icon: "help-circle",
    name: "Troubleshooting",
    description: "Fix common errors, timeouts, and checkout return issues.",
    color: "bg-stone-100 text-stone-900",
  },
];

export const SUPPORT_ARTICLES: SupportArticle[] = [
  {
    slug: "login-issues",
    topic: "account",
    title: "I cannot log in to my account",
    contentHtml: readContentHtml("support", "login-issues"),
    relatedSlugs: [
      "reset-password",
      "verify-email-address",
      "common-error-messages",
    ],
  },
  {
    slug: "reset-password",
    topic: "account",
    title: "How to reset your password",
    contentHtml: readContentHtml("support", "reset-password"),
    relatedSlugs: [
      "login-issues",
      "verify-email-address",
      "update-account-email",
    ],
  },
  {
    slug: "verify-email-address",
    topic: "account",
    title: "Email verification is not required right now",
    contentHtml: readContentHtml("support", "verify-email-address"),
    relatedSlugs: ["login-issues", "reset-password", "common-error-messages"],
  },
  {
    slug: "update-account-email",
    topic: "account",
    title: "How to update your account email",
    contentHtml: readContentHtml("support", "update-account-email"),
    relatedSlugs: [
      "verify-email-address",
      "invoices-cancellations-and-renewals",
      "login-issues",
    ],
  },
  {
    slug: "plans-and-credits",
    topic: "billing",
    title: "Plans, credits, and generation limits",
    contentHtml: readContentHtml("support", "plans-and-credits"),
    relatedSlugs: [
      "checkout-and-payment-failures",
      "invoices-cancellations-and-renewals",
      "how-tag-generation-works",
    ],
  },
  {
    slug: "checkout-and-payment-failures",
    topic: "billing",
    title: "Checkout and payment failures",
    contentHtml: readContentHtml("support", "checkout-and-payment-failures"),
    relatedSlugs: [
      "plans-and-credits",
      "checkout-return-did-not-resume",
      "common-error-messages",
    ],
  },
  {
    slug: "invoices-cancellations-and-renewals",
    topic: "billing",
    title: "Invoices, cancellations, and renewals",
    contentHtml: readContentHtml("support", "invoices-cancellations-and-renewals"),
    relatedSlugs: [
      "refund-requests",
      "plans-and-credits",
      "update-account-email",
    ],
  },
  {
    slug: "refund-requests",
    topic: "billing",
    title: "How refund requests are handled",
    contentHtml: readContentHtml("support", "refund-requests"),
    relatedSlugs: [
      "invoices-cancellations-and-renewals",
      "checkout-and-payment-failures",
      "plans-and-credits",
    ],
  },
  {
    slug: "how-tag-generation-works",
    topic: "tag-generation",
    title: "How UpdateTags tag generation works",
    contentHtml: readContentHtml("support", "how-tag-generation-works"),
    relatedSlugs: [
      "improve-tag-output-quality",
      "understanding-target-vs-discovery-tags",
      "first-generation-walkthrough",
    ],
  },
  {
    slug: "improve-tag-output-quality",
    topic: "tag-generation",
    title: "How to improve tag output quality",
    contentHtml: readContentHtml("support", "improve-tag-output-quality"),
    relatedSlugs: [
      "how-tag-generation-works",
      "first-generation-walkthrough",
      "weekly-tag-refresh-routine",
    ],
  },
  {
    slug: "understanding-target-vs-discovery-tags",
    topic: "tag-generation",
    title: "Target tags vs discovery tags",
    contentHtml: readContentHtml("support", "understanding-target-vs-discovery-tags"),
    relatedSlugs: [
      "how-tag-generation-works",
      "copy-and-paste-tags-into-etsy",
      "why-generated-tags-may-not-rank-yet",
    ],
  },
  {
    slug: "why-generated-tags-may-not-rank-yet",
    topic: "tag-generation",
    title: "Why generated tags may not rank yet",
    contentHtml: readContentHtml("support", "why-generated-tags-may-not-rank-yet"),
    relatedSlugs: [
      "understanding-target-vs-discovery-tags",
      "weekly-tag-refresh-routine",
      "generation-request-failed",
    ],
  },
  {
    slug: "account-setup-checklist",
    topic: "getting-started",
    title: "Account setup checklist",
    contentHtml: readContentHtml("support", "account-setup-checklist"),
    relatedSlugs: [
      "first-generation-checklist",
      "launch-week-basics",
      "login-issues",
    ],
  },
  {
    slug: "first-generation-checklist",
    topic: "getting-started",
    title: "First generation checklist",
    contentHtml: readContentHtml("support", "first-generation-checklist"),
    relatedSlugs: [
      "account-setup-checklist",
      "how-tag-generation-works",
      "copy-and-paste-tags-into-etsy",
    ],
  },
  {
    slug: "launch-week-basics",
    topic: "getting-started",
    title: "Launch week basics",
    contentHtml: readContentHtml("support", "launch-week-basics"),
    relatedSlugs: [
      "first-generation-checklist",
      "weekly-tag-refresh-routine",
      "plans-and-credits",
    ],
  },
  {
    slug: "map-tags-to-your-listing",
    topic: "etsy-workflow",
    title: "Map tags to your Etsy listing",
    contentHtml: readContentHtml("support", "map-tags-to-your-listing"),
    relatedSlugs: [
      "copy-and-paste-tags-into-etsy",
      "understanding-target-vs-discovery-tags",
      "weekly-tag-refresh-routine",
    ],
  },
  {
    slug: "update-listings-without-overhauling",
    topic: "etsy-workflow",
    title: "Update listings without overhauling everything",
    contentHtml: readContentHtml("support", "update-listings-without-overhauling"),
    relatedSlugs: [
      "weekly-tag-refresh-routine",
      "why-generated-tags-may-not-rank-yet",
      "generation-request-failed",
    ],
  },
  {
    slug: "track-clicks-and-sales-after-tag-updates",
    topic: "etsy-workflow",
    title: "Track clicks and sales after tag updates",
    contentHtml: readContentHtml("support", "track-clicks-and-sales-after-tag-updates"),
    relatedSlugs: [
      "update-listings-without-overhauling",
      "launch-week-basics",
      "common-error-messages",
    ],
  },
  {
    slug: "first-generation-walkthrough",
    topic: "tag-generation",
    title: "Your first generation walkthrough",
    contentHtml: readContentHtml("support", "first-generation-walkthrough"),
    relatedSlugs: [
      "how-tag-generation-works",
      "copy-and-paste-tags-into-etsy",
      "improve-tag-output-quality",
    ],
  },
  {
    slug: "copy-and-paste-tags-into-etsy",
    topic: "tag-generation",
    title: "How to copy and paste tags into Etsy",
    contentHtml: readContentHtml("support", "copy-and-paste-tags-into-etsy"),
    relatedSlugs: [
      "understanding-target-vs-discovery-tags",
      "first-generation-walkthrough",
      "weekly-tag-refresh-routine",
    ],
  },
  {
    slug: "save-and-repeat-your-best-inputs",
    topic: "tag-generation",
    title: "Save and repeat your best inputs",
    contentHtml: readContentHtml("support", "save-and-repeat-your-best-inputs"),
    relatedSlugs: [
      "first-generation-walkthrough",
      "improve-tag-output-quality",
      "weekly-tag-refresh-routine",
    ],
  },
  {
    slug: "weekly-tag-refresh-routine",
    topic: "tag-generation",
    title: "A weekly tag refresh routine",
    contentHtml: readContentHtml("support", "weekly-tag-refresh-routine"),
    relatedSlugs: [
      "save-and-repeat-your-best-inputs",
      "why-generated-tags-may-not-rank-yet",
      "plans-and-credits",
    ],
  },
  {
    slug: "generation-request-failed",
    topic: "troubleshooting",
    title: "Generation request failed",
    contentHtml: readContentHtml("support", "generation-request-failed"),
    relatedSlugs: [
      "slow-responses-and-timeouts",
      "common-error-messages",
      "how-tag-generation-works",
    ],
  },
  {
    slug: "slow-responses-and-timeouts",
    topic: "troubleshooting",
    title: "Slow responses and timeouts",
    contentHtml: readContentHtml("support", "slow-responses-and-timeouts"),
    relatedSlugs: [
      "generation-request-failed",
      "checkout-return-did-not-resume",
      "common-error-messages",
    ],
  },
  {
    slug: "checkout-return-did-not-resume",
    topic: "troubleshooting",
    title: "Checkout returned but generation did not resume",
    contentHtml: readContentHtml("support", "checkout-return-did-not-resume"),
    relatedSlugs: [
      "checkout-and-payment-failures",
      "generation-request-failed",
      "plans-and-credits",
    ],
  },
  {
    slug: "common-error-messages",
    topic: "troubleshooting",
    title: "Common error messages and what they mean",
    contentHtml: readContentHtml("support", "common-error-messages"),
    relatedSlugs: [
      "login-issues",
      "checkout-and-payment-failures",
      "generation-request-failed",
    ],
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

export function getSupportArticleBySlug(
  slug: string,
): SupportArticle | undefined {
  return SUPPORT_ARTICLES.find((article) => article.slug === slug);
}

export function getSupportArticleByTopicAndSlug(
  topic: string,
  slug: string,
): SupportArticle | undefined {
  return SUPPORT_ARTICLES.find(
    (article) => article.topic === topic && article.slug === slug,
  );
}

export function listSupportArticlesByTopic(topic: string): SupportArticle[] {
  return SUPPORT_ARTICLES.filter((article) => article.topic === topic);
}

function readContentHtml(kind: "support", slug: string): string {
  return readFileSync(join(process.cwd(), "public/content", kind, `${slug}.html`), "utf8");
}
