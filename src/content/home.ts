export type FAQAnswerPart =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

export type FAQEntry = {
  question: string;
  answer: FAQAnswerPart[];
};

export type FeaturePreview = {
  title: string;
  description: string;
  lines: string[];
  actionLabel: string;
};

export type HomeBlogCard = {
  title: string;
  body: string;
  href: string;
};

export const featurePreviews: FeaturePreview[] = [
  {
    title: "Paste a live Etsy listing",
    description:
      "Bring your existing title and description into Tagloom, then generate a full set of 13 tags.",
    lines: [
      "Listing title + description",
      "Generate 13 tags",
      "Target + discovery coverage",
    ],
    actionLabel: "Generate",
  },
  {
    title: "Compare in Generator + History",
    description:
      "Run multiple drafts, keep previous generations, and compare what changed before you update Etsy.",
    lines: ["Generator tab", "History tab", "Saved generations"],
    actionLabel: "History",
  },
  {
    title: "Copy tags into Etsy",
    description:
      "Copy your best set, test it in Etsy, and repeat updates over time as you learn what performs.",
    lines: ["13 Etsy-ready tags", "Copy in one click", "Test and improve"],
    actionLabel: "Copy tags",
  },
];

export const homeBlogCards: HomeBlogCard[] = [
  {
    title: "Tagloom Crash Course",
    body: "Start with the core workflow: listing context, buyer keywords, and test cycles that improve fit.",
    href: "/blog/how-to-rank-higher-on-etsy",
  },
  {
    title: "Etsy Tag Strategy Basics",
    body: "Learn what Etsy tags do, how buyers search, and how to avoid weak or repeated phrases.",
    href: "/blog/etsy-tag-tips-every-seller-should-know",
  },
  {
    title: "Fix Clicks Without Sales",
    body: "Use better-fit tags and listing context to attract buyers who are more likely to convert.",
    href: "/blog/why-your-etsy-listings-get-clicked-but-dont-sell",
  },
];

export const faqs: FAQEntry[] = [
  {
    question: "What is Tagloom?",
    answer: [
      {
        type: "text",
        text: "Tagloom is an Etsy tag generator for sellers with existing listings. It turns listing context into 13 practical tags you can test in Etsy.",
      },
    ],
  },
  {
    question: "What are Etsy tags?",
    answer: [
      {
        type: "text",
        text: "Etsy tags are keyword phrases buyers use in search. Etsy uses those phrases to decide which listings to show for a query.",
      },
    ],
  },
  {
    question: "How can better tags help with sales?",
    answer: [
      {
        type: "text",
        text: "Better tags can help your listing show up for more relevant searches. Better-fit visibility can contribute to more sales over time when your listing and offer are strong.",
      },
    ],
  },
  {
    question: "How do I use Tagloom?",
    answer: [
      {
        type: "text",
        text: "Paste your listing title and description, generate tags, copy them into Etsy, then monitor results and keep iterating.",
      },
    ],
  },
  {
    question: "How often should I update tags?",
    answer: [
      {
        type: "text",
        text: "Review tags regularly, especially after listing updates or seasonal shifts. Change one clear batch at a time so you can measure impact.",
      },
    ],
  },
  {
    question: "Can I generate tags for free?",
    answer: [
      {
        type: "text",
        text: "Yes. New accounts get one free generation so you can validate fit before buying a plan.",
      },
    ],
  },
  {
    question: "Where do I manage billing and plans?",
    answer: [
      { type: "text", text: "Use " },
      { type: "link", text: "billing settings", href: "/billing" },
      {
        type: "text",
        text: " to switch plans, manage renewals, and review your current generation limits.",
      },
    ],
  },
  {
    question: "Where can I get help if something breaks?",
    answer: [
      { type: "text", text: "Visit the " },
      { type: "link", text: "Support Center", href: "/support" },
      {
        type: "text",
        text: " for setup, generation, billing, and troubleshooting guides, or contact support directly.",
      },
    ],
  },
];
