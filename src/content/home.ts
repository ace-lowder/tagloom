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
  body: "Showing up in Etsy search keeps getting harder. We built UpdateTags to help sellers connect their products with the shoppers already looking for them. Etsy tags are the keywords shoppers use when searching for products like yours, and UpdateTags helps turn your existing listing into tags you can copy into Etsy and keep testing over time.",
  cta: "Learn more",
};

export const faqs: FAQEntry[] = [
  {
    question: "What is UpdateTags?",
    answer: [
      {
        type: "text",
        text: "UpdateTags is an Etsy tag generator for sellers looking to improve their existing listings. One of the hardest parts of Etsy is getting your products in front of the right shoppers. Tags are one way Etsy understands your product and matches it with shopper searches.",
      },
      { type: "break" },
      {
        type: "text",
        text: "When your tags are too broad, missing details, or aimed at the wrong audience, your listing can get buried under countless others. UpdateTags uses your title and description to suggest tags that are optimized for your product and niche. Just copy and paste your product details into the ",
      },
      { type: "link", label: "UpdateTags generator", href: "#generator" },
      {
        type: "text",
        text: " and upgrade your Etsy listings today.",
      },
    ],
  },
  {
    question: "What are Etsy tags?",
    answer: [
      {
        type: "text",
        text: "Etsy tags are keywords and phrases you add to a listing to help Etsy understand what you sell. Shoppers don’t always search the exact words in your title, so you can use tags to fill in those gaps.",
      },
      { type: "break" },
      {
        type: "text",
        text: "Good tags usually describe what the item is, who it's for, or when someone might buy it. For example, a candle listing might use tags for the scent, occasion, or ingredients. You can learn more about what makes good tags on our ",
      },
      { type: "link", label: "blog", href: "/blog" },
      {
        type: "text",
        text: ", or paste your listing into the ",
      },
      { type: "link", label: "UpdateTags generator", href: "#generator" },
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
        text: "Yes, and Etsy tags are a great place to start. They’re easy to update and help Etsy match your listing with shoppers looking for products like yours.",
      },
      { type: "break" },
      {
        type: "text",
        text: "That means more chances for views, favorites, and orders, especially if your product is already strong. ",
      },
      { type: "link", label: "UpdateTags", href: "#generator" },
      {
        type: "text",
        text: " generates tag ideas that are optimized for your product and niche. Once your tags are updated, you can use the guides on our ",
      },
      { type: "link", label: "blog", href: "/blog" },
      {
        type: "text",
        text: " to help convert those new customers into sales.",
      },
    ],
  },
  {
    question: "How do I use UpdateTags with my Etsy listing?",
    answer: [
      {
        type: "text",
        text: "Using UpdateTags is as easy as copying and pasting from Etsy. Take your product title and description from Etsy, paste them into the ",
      },
      { type: "link", label: "UpdateTags generator", href: "#generator" },
      {
        type: "text",
        text: ", and we'll generate optimized tags for your product. Once your tags are generated, edit your listing in Etsy and copy over the tags you want to use. It only takes a few moments to update any listing in your shop.",
      },
    ],
  },
  {
    question: "What should I do after I copy my tags into Etsy?",
    answer: [
      {
        type: "text",
        text: "Once you copy your new tags into an Etsy listing, you should keep an eye on your listing. Watch for signs like more views, favorites, or orders, and compare that with how the listing was doing before. If the listing still is not getting the views you expect, come back to ",
      },
      { type: "link", label: "UpdateTags", href: "#generator" },
      {
        type: "text",
        text: " and generate another set of tag ideas. You can also use the guides on our ",
      },
      { type: "link", label: "blog", href: "/blog" },
      {
        type: "text",
        text: " to improve your title and description, then regenerate tags based on your updates.",
      },
    ],
  },
  {
    question: "How often should I update my tags?",
    answer: [
      {
        type: "text",
        text: "A good starting point is updating your tags once a month. Create a new set of tags today, then watch how the listing does over the next few weeks so you can get an understanding of how the listing does. If your product is not getting the views you expect, use the guides on our ",
      },
      { type: "link", label: "blog", href: "/blog" },
      {
        type: "text",
        text: " to improve the rest of your listing, then use the ",
      },
      { type: "link", label: "UpdateTags generator", href: "#generator" },
      {
        type: "text",
        text: " to refresh your tags. Continue this process of updating and monitoring your product until you start earning the sales you expect.",
      },
    ],
  },
  {
    question: "Can I save and compare past tags?",
    answer: [
      {
        type: "text",
        text: "Yes, and it is a great way to learn what works. UpdateTags saves your past tag ideas so you can come back and compare what you’ve tried before. Just click the history toggle button on the top right of the ",
      },
      { type: "link", label: "UpdateTags generator", href: "#generator" },
      {
        type: "text",
        text: " to see your past generations. Over time, we recommend comparing your listing’s views, favorites, and sales across different tag sets.",
      },
    ],
  },
  {
    question: "How much does UpdateTags cost?",
    answer: [
      {
        type: "text",
        text: "Your first tag generation is free! All you need to do is create a new account.",
      },
      { type: "break" },
      {
        type: "text",
        text: "If you want more tag generations, saved tag history, or unlimited generations, take a look at our ",
      },
      { type: "link", label: "plans", href: "#plans" },
      {
        type: "text",
        text: " and choose a plan that fits your Etsy needs. Starter is great for sellers with a few listings, while Monthly and Yearly are better for sellers who want to optimize tags across their shop.",
      },
    ],
  },
  {
    question: "How do I get help if something goes wrong?",
    answer: [
      {
        type: "text",
        text: "If you aren't satisfied with your generated tags, or have any issues with your account, visit our ",
      },
      { type: "link", label: "support", href: "/support" },
      {
        type: "text",
        text: " page for help. Include what you were trying to do and what went wrong so our support team can help find a solution for your needs.",
      },
    ],
  },
];
