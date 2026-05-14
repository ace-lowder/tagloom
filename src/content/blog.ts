import { readFileSync } from "fs";
import { join } from "path";

export type BlogCategory = "SEO" | "Strategy" | "Tips" | "Research";

export type BlogSection = {
  id: string;
  // TOC hierarchy only; does not control in-article heading typography.
  level: 2 | 3;
  title: string;
};

export type BlogBottomCta = {
  eyebrow?: string;
  heading: string;
  body: string;
  buttonLabel: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: BlogCategory;
  readTime: string;
  heroImage?: string;
  bottomCta?: BlogBottomCta;
  contentHtml: string;
  sections: BlogSection[];
};


export const DEFAULT_BLOG_BOTTOM_CTA: BlogBottomCta = {
  eyebrow: "Ready to Apply This?",
  heading: "Try the Tagloom tag generator for free",
  body: "Turned what you learned into action. Generate 13 optimized Etsy tags in seconds to improve your listing today.",
  buttonLabel: "Try it free",
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-rank-higher-on-etsy",
    title: "How to Rank Higher on Etsy",
    excerpt:
      "If Etsy search feels confusing at first, you are not alone. Etsy first finds listings that match a shopper's words, then ranks those matches based on what seems most useful and most likely to convert.",
    date: "Feb 28, 2026",
    category: "SEO",
    readTime: "7 min read",
    heroImage: "/blog-how-to-rank-higher-on-etsy-hero.png",
    sections: [
      { id: "how-etsy-search-works", level: 2, title: "How Etsy Search Works" },
      { id: "start-with-keywords", level: 2, title: "Start with Keywords" },
      { id: "build-your-listing", level: 2, title: "Build Your Listing" },
      { id: "photos-photos-photos", level: 2, title: "Photos, Photos, Photos" },
      { id: "improve-conversions", level: 2, title: "Improve Conversions" },
      {
        id: "turn-orders-into-reviews",
        level: 3,
        title: "Turn Orders into Reviews",
      },
      {
        id: "build-trust-in-your-shop",
        level: 3,
        title: "Build Trust in Your Shop",
      },
      { id: "improve-every-month", level: 2, title: "Improve Every Month" },
      { id: "listing-checklist", level: 2, title: "Listing Checklist" },
    ],
    contentHtml: readContentHtml("blog", "how-to-rank-higher-on-etsy"),
  },
  {
    slug: "etsy-algorithm-explained",
    title: "What We Know About the Etsy Algorithm",
    excerpt:
      "What we know about Etsy ranking, from tags and tag generation to conversion, reviews, and listing quality signals.",
    date: "Feb 14, 2026",
    category: "Strategy",
    readTime: "9 min read",
    sections: [
      { id: "the-algorithm", level: 2, title: "The Algorithm" },
      { id: "why-should-i-care", level: 3, title: "Why Should I Care?" },
      { id: "how-to-get-found", level: 2, title: "How to Get Found" },
      { id: "clicks-and-sales", level: 3, title: "Clicks and Sales" },
      { id: "quality-signals", level: 3, title: "Quality Signals" },
      {
        id: "photo-upgrades-to-boost-clicks",
        level: 2,
        title: "Photo Upgrades to Boost Clicks",
      },
      {
        id: "pricing-shipping-and-rank",
        level: 2,
        title: "Pricing, Shipping, and Rank",
      },
      {
        id: "reviews-and-customer-experience",
        level: 2,
        title: "Reviews and Customer Experience",
      },
      { id: "niches-consistency", level: 2, title: "Niches? Consistency?" },
      {
        id: "what-we-dont-know-for-sure",
        level: 2,
        title: "What We Don't Know for Sure",
      },
      { id: "what-now", level: 2, title: "What Now?" },
    ],
    contentHtml: readContentHtml("blog", "etsy-algorithm-explained"),
  },
  {
    slug: "mistakes-new-etsy-sellers-make",
    title: "7 Mistakes New Etsy Sellers Make",
    excerpt:
      "The most common beginner mistakes that quietly hurt Etsy clicks and sales, plus what to do instead this week.",
    date: "Jan 30, 2026",
    category: "Tips",
    readTime: "6 min read",
    sections: [
      {
        id: "forgetting-about-mobile",
        level: 2,
        title: "Forgetting About Mobile",
      },
      { id: "wasting-tag-slots", level: 2, title: "Wasting Tag Slots" },
      {
        id: "adding-fluff-to-titles",
        level: 2,
        title: "Adding Fluff to Titles",
      },
      {
        id: "underestimating-processing-time",
        level: 2,
        title: "Underestimating Processing Time",
      },
      {
        id: "hiding-important-details-in-the-description",
        level: 2,
        title: "Hiding Important Details in the Description",
      },
      { id: "leaving-shop-policies-blank", level: 2, title: "Leaving Shop Policies Blank" },
      { id: "updating-multiple-things-at-once", level: 2, title: "Updating Multiple Things at Once" },
    ],
    contentHtml: readContentHtml("blog", "mistakes-new-etsy-sellers-make"),
  },
  {
    slug: "etsy-tag-tips-every-seller-should-know",
    title: "Etsy Tag Tips That Every Seller Should Know",
    excerpt:
      "A practical guide to writing better Etsy tags so more of the right shoppers can find and buy your listings.",
    date: "Mar 20, 2026",
    category: "SEO",
    readTime: "6 min read",
    sections: [
      { id: "how-tags-get-used", level: 2, title: "How Tags Get Used" },
      { id: "use-all-available-tags", level: 2, title: "Use All Available Tags" },
      { id: "dont-repeat-yourself", level: 2, title: "Don't Repeat Yourself" },
      { id: "choose-specific-phrases", level: 2, title: "Choose Specific Phrases" },
      { id: "tags-titles-and-descriptions", level: 2, title: "Tags, Titles, and Descriptions" },
      { id: "update-your-tags-regularly", level: 2, title: "Update Your Tags Regularly" },
      { id: "quick-tag-checklist", level: 2, title: "Quick Tag Checklist" },
    ],
    contentHtml: readContentHtml("blog", "etsy-tag-tips-every-seller-should-know"),
  },
  {
    slug: "why-your-etsy-listings-get-clicked-but-dont-sell",
    title: "Why Your Etsy Listings Get Clicked but Don’t Sell",
    excerpt:
      "If your Etsy listings get traffic but not enough orders, this breakdown shows where buyers get stuck and how to fix it.",
    date: "Mar 20, 2026",
    category: "Strategy",
    readTime: "6 min read",
    sections: [
      { id: "whats-missing", level: 2, title: "What’s Missing?" },
      { id: "the-conversion-gap", level: 2, title: "The Conversion Gap" },
      { id: "photos-and-titles", level: 2, title: "Photos and Titles" },
      { id: "buyer-friction", level: 2, title: "Buyer Friction" },
      { id: "expectations-vs-reality", level: 2, title: "Expectations vs Reality" },
      { id: "trust-gaps", level: 2, title: "Trust Gaps" },
      { id: "your-new-plan", level: 2, title: "Your New Plan" },
    ],
    contentHtml: readContentHtml("blog", "why-your-etsy-listings-get-clicked-but-dont-sell"),
  },
];

export function listBlogPosts(): BlogPost[] {
  return BLOG_POSTS;
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

function readContentHtml(kind: "blog", slug: string): string {
  return readFileSync(join(process.cwd(), "public/content", kind, `${slug}.html`), "utf8");
}
