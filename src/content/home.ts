export type FAQEntry = {
  question: string;
  answer: (
    | { type: "text"; text: string }
    | { type: "link"; label: string; href: string }
  )[];
};

export type AboutSectionCopy = {
  eyebrow: string;
  heading: string;
  body: string;
  cta: string;
};

export const aboutSectionCopy: AboutSectionCopy = {
  eyebrow: "ABOUT",
  heading: "Tagloom turns your Etsy listing into searchable tags",
  body: "Etsy tags are keywords shoppers use to find products. If your tags are too broad, missing details, or copied from noisy listing text, your products can be harder to find. Tagloom reads your existing listing and suggests tags that match what you sell, so you can copy your generated tags into Etsy and keep testing new tag sets as your listings change.",
  cta: "Learn more",
};

export const faqs: FAQEntry[] = [
  {
    question: "What is Tagloom?",
    answer: [
      {
        type: "text",
        text: "Tagloom is an Etsy tag generator for sellers with existing listings. Paste your listing title and description, and Tagloom suggests search tags you can copy into Etsy.",
      },
      { type: "text", text: " " },
      { type: "link", label: "Try it now", href: "#generator" },
    ],
  },
  {
    question: "What are Etsy tags?",
    answer: [
      {
        type: "text",
        text: "Etsy tags are keywords shoppers use when searching for products. They help Etsy understand what your listing is and when it should show up in search.",
      },
      { type: "text", text: " " },
      { type: "link", label: "Learn more about tags", href: "/blog" },
    ],
  },
  {
    question: "Can better Etsy tags help me get more sales?",
    answer: [
      {
        type: "text",
        text: "Better tags can help improve visibility, and better visibility can lead to more sales over time. Tagloom helps you find stronger tag ideas without guessing, but no tag tool can guarantee sales.",
      },
      { type: "text", text: " " },
      { type: "link", label: "Generate better tags", href: "#generator" },
    ],
  },
  {
    question: "How do I use Tagloom with my Etsy listing?",
    answer: [
      {
        type: "text",
        text: "Copy your Etsy listing title and description into Tagloom, generate tags, then copy your favorite tags into the tag section of your Etsy listing. You stay in control of what gets added to Etsy.",
      },
      { type: "text", text: " " },
      { type: "link", label: "Start generating", href: "#generator" },
    ],
  },
  {
    question: "How often should I update my tags?",
    answer: [
      {
        type: "text",
        text: "Test new tags when a listing is not getting views, when your product changes, or when you learn better search terms from shoppers and competitors. Tag changes can take time to show results, so compare over time instead of changing everything daily.",
      },
      { type: "text", text: " " },
      { type: "link", label: "Read the guides", href: "/blog" },
    ],
  },
  {
    question: "Can I save and compare past tag generations?",
    answer: [
      {
        type: "text",
        text: "Yes. Tagloom saves your generations so you can review older tag sets, compare ideas, and keep improving your listings over time.",
      },
      { type: "text", text: " " },
      { type: "link", label: "Try history", href: "#generator" },
    ],
  },
  {
    question: "What happens after I copy my tags into Etsy?",
    answer: [
      {
        type: "text",
        text: "After you copy your generated tags into Etsy, watch your views, favorites, and sales. If a listing still is not getting found, generate another set and test a different search angle.",
      },
      { type: "text", text: " " },
      { type: "link", label: "Read optimization tips", href: "/blog" },
    ],
  },
  {
    question: "How much does Tagloom cost?",
    answer: [
      {
        type: "text",
        text: "You can try Tagloom for free. Paid plans are for sellers who want more generations, saved history, and more room to keep testing across listings.",
      },
      { type: "text", text: " " },
      { type: "link", label: "See pricing", href: "#pricing" },
    ],
  },
  {
    question: "How do I get help if something goes wrong?",
    answer: [
      { type: "text", text: "Visit " },
      { type: "link", label: "support", href: "/support" },
      { type: "text", text: " for account, billing, generation, or contact help." },
    ],
  },
];
