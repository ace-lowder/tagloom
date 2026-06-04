export type FAQEntry = {
  question: string;
  answer: (
    | { type: "text"; text: string }
    | { type: "link"; label: string; href: string }
  )[];
};

export type AboutSectionCopy = {
  heading: string;
  body: string;
  cta: string;
};

export const aboutSectionCopy: AboutSectionCopy = {
  heading: "Turn your Etsy listing into searchable tags",
  body: "Etsy tags are keywords shoppers use to find products. If your tags are too broad, missing details, or copied from noisy listing text, your products can be harder to find. Tagloom reads your existing listing and suggests tags that match what you sell, so you can copy your generated tags into Etsy and keep testing new tag sets as your listings change.",
  cta: "Learn more",
};

export const faqs: FAQEntry[] = [
  {
    question: "What is Tagloom?",
    answer: [
      {
        type: "text",
        text: "Tagloom is an Etsy tag generator for sellers with existing listings. Paste your listing into Tagloom, use ",
      },
      { type: "link", label: "try it now", href: "#generator" },
      {
        type: "text",
        text: ", and it suggests search tags you can copy into Etsy. You stay in control of which tags you use.",
      },
    ],
  },
  {
    question: "What are Etsy tags?",
    answer: [
      {
        type: "text",
        text: "Etsy tags are keywords shoppers use when searching for products. If you want a deeper explanation, ",
      },
      { type: "link", label: "learn more about tags", href: "/blog" },
      {
        type: "text",
        text: " in the guide. The simple version is that tags help Etsy understand when your listing should appear in search.",
      },
    ],
  },
  {
    question: "Can better Etsy tags help me get more sales?",
    answer: [
      {
        type: "text",
        text: "Better tags can help more relevant shoppers find your listing. Use ",
      },
      { type: "link", label: "generate better tags", href: "#generator" },
      {
        type: "text",
        text: " to test stronger search phrases for products you already sell. More relevant visibility can lead to more chances for views, favorites, and sales, but no tag tool can guarantee sales.",
      },
    ],
  },
  {
    question: "How do I use Tagloom with my Etsy listing?",
    answer: [
      {
        type: "text",
        text: "You do not need to rebuild your whole listing. Paste your title and description into ",
      },
      { type: "link", label: "Tagloom", href: "#generator" },
      {
        type: "text",
        text: ", then review the generated tags. Copy the best matches into Etsy and keep the ones that fit your product.",
      },
    ],
  },
  {
    question: "How often should I update my tags?",
    answer: [
      {
        type: "text",
        text: "Update tags when a listing is not getting views, when your product changes, or when you learn better search terms. You can ",
      },
      { type: "link", label: "read the guides", href: "/blog" },
      {
        type: "text",
        text: " to understand what to test. Give changes time before replacing everything again.",
      },
    ],
  },
  {
    question: "Can I save and compare past tag generations?",
    answer: [
      {
        type: "text",
        text: "Yes, Tagloom saves your past generations. Open the generator and ",
      },
      { type: "link", label: "try history", href: "#generator" },
      {
        type: "text",
        text: " to compare previous tag sets. This makes it easier to keep improving instead of losing every idea after one run.",
      },
    ],
  },
  {
    question: "What happens after I copy my tags into Etsy?",
    answer: [
      {
        type: "text",
        text: "Once the tags are in Etsy, your next job is to watch the listing. If performance stays weak, ",
      },
      { type: "link", label: "learn what to test", href: "/blog" },
      {
        type: "text",
        text: " and generate another set. Tagloom is meant to support repeated improvement, not one magic update.",
      },
    ],
  },
  {
    question: "How much does Tagloom cost?",
    answer: [
      {
        type: "text",
        text: "You can try Tagloom for free. If you need more generations, ",
      },
      { type: "link", label: "see pricing", href: "#pricing" },
      {
        type: "text",
        text: " for paid plans. Paid plans are for sellers testing tags across more listings over time.",
      },
    ],
  },
  {
    question: "How do I get help if something goes wrong?",
    answer: [
      { type: "text", text: "If something breaks, visit " },
      { type: "link", label: "support", href: "/support" },
      {
        type: "text",
        text: " for account, billing, generation, or contact help. Include what you were trying to do when the issue happened. That makes it easier to troubleshoot quickly.",
      },
    ],
  },
];
