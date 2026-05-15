import { Clock, TrendingUp, Zap } from "lucide-react";

// === Types ===

export type BenefitItem = {
  icon: typeof TrendingUp;
  title: string;
  description: string;
  href: string;
};

export type FAQAnswerPart =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string };

export type FAQEntry = {
  question: string;
  answer: FAQAnswerPart[];
};

// === Content ===

export const benefits: BenefitItem[] = [
  {
    icon: TrendingUp,
    title: "Get found in Etsy search",
    description:
      "We craft tags based on what buyers are actually searching for so your listings get found by the right people.",
    href: "/blog/how-to-rank-higher-on-etsy#why-tags-matter",
  },
  {
    icon: Clock,
    title: "Get tags in seconds",
    description:
      "Stop wasting time on keyword research and generate optimized tags for your listing in seconds.",
    href: "/blog/etsy-tag-tips-every-seller-should-know",
  },
  {
    icon: Zap,
    title: "No more guesswork",
    description:
      "Every tag is selected to match you with Etsy customers and make your listing discoverable.",
    href: "/blog/mistakes-new-etsy-sellers-make",
  },
];

export const faqs: FAQEntry[] = [
  {
    question: "How does Tagloom generate tags?",
    answer: [
      {
        type: "text",
        text: "Tagloom analyzes your title and description, identifies high-intent keywords, and builds a balanced 13-tag set that combines direct search terms with broader discovery terms. We find the best combination of tags that will boost sales for your listing.",
      },
    ],
  },
  {
    question: "Will these tags work for my niche?",
    answer: [
      {
        type: "text",
        text: "Yes. Your tags are generated using the niche terms from your listing title and description. We generate optimized tags for both exact-match shopper intent and discovery, then add generalized synonyms to keep you relevant across categories.",
      },
    ],
  },
  {
    question: "Do I need to connect my Etsy account to Tagloom?",
    answer: [
      {
        type: "text",
        text: "No, you don't need to connect anything. Generate your tags here, then quickly copy and paste them into your Etsy listing.",
      },
    ],
  },
  {
    question: "Can I generate tags for free?",
    answer: [
      {
        type: "text",
        text: "Yes, every account gets 1 free generation so you can test Tagloom before upgrading.",
      },
    ],
  },
  {
    question: "Can I switch between Monthly and Yearly plans?",
    answer: [
      {
        type: "text",
        text: "Yes, you can switch between Monthly and Yearly anytime from your ",
      },
      {
        type: "link",
        text: "billing settings",
        href: "/billing",
      },
      {
        type: "text",
        text: ".",
      },
    ],
  },
  {
    question: "What happens when I run out of monthly generations?",
    answer: [
      {
        type: "text",
        text: "Your Monthly generation limit resets on your billing date. If you need more before then you can upgrade to Yearly for unlimited generations or buy Starter generations.",
      },
    ],
  },
  {
    question: "Where can I manage my plan?",
    answer: [
      {
        type: "text",
        text: "Open the profile icon in the top-right corner, click ",
      },
      {
        type: "link",
        text: "Manage Plan",
        href: "/billing",
      },
      {
        type: "text",
        text: ", and view your billing settings there.",
      },
    ],
  },
  {
    question: "How many tags does Etsy allow?",
    answer: [
      {
        type: "text",
        text: "Etsy allows 13 tags per listing. Tagloom generates an optimized list of 13 tags that takes advantage of the character limit to make the most of every tag slot.",
      },
    ],
  },
  {
    question: "Can I cancel anytime?",
    answer: [
      {
        type: "text",
        text: "Yes, you can cancel anytime in billing and your plan stays active until the end of your current period. At the end of your period, your plan will cancel and you will not be charged.",
      },
    ],
  },
];
