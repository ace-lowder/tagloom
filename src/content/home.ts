export type FAQEntry = {
  question: string;
  answer: (
    | { type: "text"; text: string }
    | { type: "link"; label: string; href: string }
    | { type: "break" }
  )[];
};

export type AboutSectionCopy = {
  heading: string;
  body: string;
  cta: string;
};

export const aboutSectionCopy: AboutSectionCopy = {
  heading: "Turn your Etsy listing into searchable tags",
  body: "Showing up in Etsy search keeps getting harder. We built Tagloom to help sellers connect their products with the shoppers already looking for them. Etsy tags are the keywords shoppers use when searching for products like yours, and Tagloom helps turn your existing listing into tags you can copy into Etsy and keep testing over time.",
  cta: "Learn more",
};

export const faqs: FAQEntry[] = [
  {
    question: "What is Tagloom?",
    answer: [
      {
        type: "text",
        text: "Tagloom is an Etsy tag generator for sellers who want to improve existing listings. One of the hardest parts of Etsy is helping the right shoppers find what you sell. Tags are one way Etsy understands your product and matches it with shopper searches.",
      },
      { type: "break" },
      {
        type: "text",
        text: "When your tags are too broad, missing details, or aimed at the wrong audience, your listing can be harder to find. Tagloom reads your title and description, then suggests tags that fit your product and the shoppers likely searching for it. Paste your listing into the ",
      },
      { type: "link", label: "Tagloom generator", href: "#generator" },
      {
        type: "text",
        text: " and you’ll get tags you can copy into Etsy and test today.",
      },
    ],
  },
  {
    question: "What are Etsy tags?",
    answer: [
      {
        type: "text",
        text: "Etsy tags are keywords and phrases you add to a listing to help Etsy understand what you sell. Shoppers do not always search with the same words you use in your title, so tags give you more chances to describe your product.",
      },
      { type: "break" },
      {
        type: "text",
        text: "Good tags usually describe what the item is, who it is for, when someone might buy it, and what style or details make it specific. For example, a candle listing might use tags for the scent, gift occasion, room, material, or type of shopper. If you want a deeper explanation, read more on the ",
      },
      { type: "link", label: "blog", href: "/blog" },
      {
        type: "text",
        text: ", or paste your listing into the ",
      },
      { type: "link", label: "Tagloom generator", href: "#generator" },
      {
        type: "text",
        text: " to see tag ideas for your own product.",
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
