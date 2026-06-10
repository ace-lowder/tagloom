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
        text: "Tagloom is an Etsy tag generator for sellers who want to improve existing listings. One of the hardest parts of Etsy is getting your products in front of the right shoppers. Tags are one way Etsy understands your product and matches it with shopper searches.",
      },
      { type: "break" },
      {
        type: "text",
        text: "When your tags are too broad, missing details, or aimed at the wrong audience, your listing can be harder to find. Tagloom reads your title and description, then suggests tags that describe your product in ways shoppers might search for. Paste your listing into the ",
      },
      { type: "link", label: "Tagloom generator", href: "#generator" },
      {
        type: "text",
        text: " and you’ll get tags you can copy into Etsy today.",
      },
    ],
  },
  {
    question: "What are Etsy tags?",
    answer: [
      {
        type: "text",
        text: "Etsy tags are keywords and phrases you add to a listing to help Etsy understand what you sell. Shoppers don’t always search with the same words you use in your title, so you can use tags to fill in those gaps.",
      },
      { type: "break" },
      {
        type: "text",
        text: "Good tags usually describe what the item is, who it is for, or when someone might buy it. For example, a candle listing might use tags for the scent, occasion, or ingredients. You can learn more about what makes good tags on our ",
      },
      { type: "link", label: "blog", href: "/blog" },
      {
        type: "text",
        text: ", or paste your listing into the ",
      },
      { type: "link", label: "Tagloom generator", href: "#generator" },
      {
        type: "text",
        text: " to get tag ideas for your own product.",
      },
    ],
  },
  {
    question: "Can better Etsy tags help me get more sales?",
    answer: [
      {
        type: "text",
        text: "Etsy tags are a good place to start when you want more sales, but they can’t promise sales. They’re easy to update and can help Etsy match your listing with shoppers looking for products like yours.",
      },
      { type: "break" },
      {
        type: "text",
        text: "That can mean more chances for views, favorites, and orders, especially if your photos, price, and product are already strong. ",
      },
      { type: "link", label: "Tagloom", href: "#generator" },
      {
        type: "text",
        text: " gives you tag ideas for listings you already have, and you can use the guides on our ",
      },
      { type: "link", label: "blog", href: "/blog" },
      {
        type: "text",
        text: " to make the rest of your listing stronger too.",
      },
    ],
  },
  {
    question: "How do I use Tagloom with my Etsy listing?",
    answer: [
      {
        type: "text",
        text: "Using Tagloom is as easy as copying and pasting from Etsy. Copy your product title and description from Etsy, paste them into the ",
      },
      { type: "link", label: "Tagloom generator", href: "#generator" },
      {
        type: "text",
        text: ", and Tagloom will give you tag ideas for that product. Once your tags are generated, edit your listing in Etsy and copy over the tags you want to use. In just a few moments, you can update any listing in your shop.",
      },
    ],
  },
  {
    question: "What should I do after I copy my tags into Etsy?",
    answer: [
      {
        type: "text",
        text: "Once you copy your new tags into an Etsy listing, monitor how it does. Watch for signs like more views, favorites, or orders, and compare that with how the listing was doing before. If the listing still is not getting the views you expect, come back to ",
      },
      { type: "link", label: "Tagloom", href: "#generator" },
      {
        type: "text",
        text: " and generate another set of tag ideas. You can also use the guides on our ",
      },
      { type: "link", label: "blog", href: "/blog" },
      {
        type: "text",
        text: " to improve your title and description, then regenerate tags from your updated listing.",
      },
    ],
  },
  {
    question: "How often should I update my tags?",
    answer: [
      {
        type: "text",
        text: "A good starting point is updating your tags once a month. Update your tags today, then watch how the listing does over the next few weeks so you can compare one tag set against another. If your listing is not getting the views you expect, use the guides on our ",
      },
      { type: "link", label: "blog", href: "/blog" },
      {
        type: "text",
        text: " to improve the rest of your listing, then use the ",
      },
      { type: "link", label: "Tagloom generator", href: "#generator" },
      {
        type: "text",
        text: " for fresh tag ideas.",
      },
    ],
  },
  {
    question: "Can I save and compare past tags?",
    answer: [
      {
        type: "text",
        text: "Yes, and it is a great way to learn what works. Tagloom saves your past tag ideas so you can come back and compare what you tried before. Open your history in the ",
      },
      { type: "link", label: "Tagloom generator", href: "#generator" },
      {
        type: "text",
        text: " to review past tags, then compare your listing’s views, favorites, and sales across different tag sets.",
      },
    ],
  },
  {
    question: "How much does Tagloom cost?",
    answer: [
      {
        type: "text",
        text: "Your first tag generation is free. Create an account to try it.",
      },
      { type: "break" },
      {
        type: "text",
        text: "If you want more tag generations, saved tag history, or unlimited generations, ",
      },
      { type: "link", label: "see pricing", href: "#pricing" },
      {
        type: "text",
        text: " and choose the plan that fits your Etsy needs. Starter is great for sellers with a few listings, while Monthly and Yearly are better for sellers who want to keep testing tags across their shop.",
      },
    ],
  },
  {
    question: "How do I get help if something goes wrong?",
    answer: [
      {
        type: "text",
        text: "If something breaks, visit our ",
      },
      { type: "link", label: "support", href: "/support" },
      {
        type: "text",
        text: " page for help. Include what you were trying to do and what went wrong so our support team can help faster.",
      },
    ],
  },
];
