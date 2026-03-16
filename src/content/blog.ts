export type BlogCategory = "SEO" | "Strategy" | "Tips" | "Research";

export type BlogSection = {
  id: string;
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

const BLOG_IMAGE_1 = `<img src="/blog-inline-1.svg" alt="Tag strategy planning board" />`;
const BLOG_IMAGE_2 = `<img src="/blog-inline-2.svg" alt="Etsy search trend dashboard" />`;
const BLOG_IMAGE_PHOTOS = `<img src="/blog-photos-photos-photos.png" alt="Abstract listing photo composition example" />`;

export const DEFAULT_BLOG_BOTTOM_CTA: BlogBottomCta = {
  eyebrow: "Ready to Put This Into Action?",
  heading: "Generate better Etsy tags in seconds with Tagloom",
  body:
    "Use the Tagloom tag generator to create 13 optimized Etsy tags and turn what you learned into faster listing improvements. Try it now for free.",
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
    bottomCta: {
      eyebrow: "Ready to Apply This?",
      heading: "Use the Tagloom tag generator to rank higher on Etsy",
      body:
        "Turn what you just learned into action. Generate 13 optimized Etsy tags in seconds and try Tagloom now for free.",
      buttonLabel: "Try it free",
    },
    sections: [
      { id: "how-etsy-search-works", level: 2, title: "How Etsy Search Works" },
      { id: "start-with-keywords", level: 2, title: "Start with Keywords" },
      { id: "build-your-listing", level: 2, title: "Build Your Listing" },
      { id: "photos-photos-photos", level: 2, title: "Photos, Photos, Photos" },
      { id: "improve-conversions", level: 2, title: "Improve Conversions" },
      {
        id: "turn-orders-into-reviews",
        level: 2,
        title: "Turn Orders into Reviews",
      },
      {
        id: "build-trust-in-your-shop",
        level: 2,
        title: "Build Trust in Your Shop",
      },
      { id: "improve-every-month", level: 2, title: "Improve Every Month" },
      { id: "listing-checklist", level: 2, title: "Listing Checklist" },
    ],
    contentHtml: `
      <h2 id="how-etsy-search-works">How Etsy Search Works</h2>
      <p>If Etsy search feels confusing at first, you are not alone. A simple way to think about it is this: Etsy first finds listings that match a shopper’s words, then ranks those matches based on which listings seem most useful and most likely to convert.</p>
      <p>The first step is keyword matching. Etsy looks at your title, tags, categories, attributes, and parts of your description to decide whether your listing is relevant. If your listing language clearly matches what buyers type, you earn more chances to appear.</p>
      <p>The second step is performance. Once your listing is shown, Etsy pays attention to signals like clicks, favorites, purchases, review quality, and shop reliability. Listings that help shoppers quickly find what they want usually keep getting stronger placement over time.</p>
      <p>Ranking higher is not one trick. It is a system with clear keywords, strong photos, a clear offer, and a good buyer experience after the sale. When those pieces work together, Etsy has more confidence showing your listings to more buyers.</p>

      <h2 id="start-with-keywords">Start with Keywords</h2>
      <p>If you are new, start here. Keywords are how Etsy understands what you sell. Etsy looks at your title, tags, categories, attributes, and description together, so your goal is to use clear shopper language across all of them.</p>
      <p>When you generate tags, focus on buyer intent phrases instead of random words. Multi word tags usually perform better than single words because they match real searches with stronger intent.</p>
      <ul>
        <li>Use all 13 tags and make each one unique.</li>
        <li>Prefer intent phrases like <em>ceramic mug</em> or <em>handmade coffee mug</em>.</li>
        <li>Avoid repeating the same phrase in multiple slots.</li>
        <li>Use categories and attributes to support your tag generation strategy.</li>
      </ul>
      <p>Treat keywords as a living system. Check Shop Stats, find searches that bring quality traffic, and refresh weak tags every few weeks. Small updates done consistently usually create steady ranking gains.</p>

      <h2 id="build-your-listing">Build Your Listing</h2>
      <p>Once your keywords are set, your listing needs the same clarity from top to bottom. Keep your title short, readable, and specific so shoppers instantly understand what they are clicking on. Lead with your most important phrase, especially for mobile shoppers who only see the beginning.</p>
      <p>Your description should confirm exactly what the item is, who it is for, and why it is worth buying. In the first lines, naturally include your main tags and related keyword phrases in normal language, then answer common buyer questions like size, material, and variations.</p>
      <p>Use categories and attributes as part of your SEO foundation, not an afterthought. The more accurate these details are, the easier it is for Etsy to match your listing to the right searches.</p>
      <p>Before publishing, do one final conversion check. Is your listing clear, accurate, and easy to trust at a glance? Strong listings are not just keyword matched. They are easy for real people to understand and buy.</p>

      <h2 id="photos-photos-photos">Photos, Photos, Photos</h2>
      <p>Great photos do two big jobs at once. They help your listing get clicked, and they help shoppers feel confident enough to buy. Etsy can match your keywords and tags, but if your first photo does not stop the scroll, you lose sales before buyers even read your title.</p>
      <p>Use all available photo slots and think of them as a story.</p>
      <ul>
        <li>Start with a clean hero image.</li>
        <li>Show different angles and close up details.</li>
        <li>Add size or scale context.</li>
        <li>Show what the item looks like in real life.</li>
      </ul>
      <p>Keep images simple and product focused. Avoid heavy text overlays, distracting props, and watermarks that compete with the item itself. Bright clear lighting and consistency across your shop often perform better than over styled photos.</p>
      <p>If conversions are low, photos are one of the fastest things to improve. Test your first image, watch clicks and favorites, and keep upgrading until shoppers immediately understand the value.</p>
      ${BLOG_IMAGE_PHOTOS}

      <h2 id="improve-conversions">Improve Conversions</h2>
      <p>Getting views is great, but conversions are what push rankings up over time. Etsy pays attention to how shoppers interact with your listing, so your goal is to make the buying decision feel easy and safe from the moment someone clicks.</p>
      <p>Start with pricing and shipping because those are often the first blockers. Your item does not need to be the cheapest, but the value should be obvious. If shipping is high, explain why clearly and set accurate delivery expectations.</p>
      <p>Then remove confusion from the listing itself. Make sure the title, first photo, description, and tags all describe the same exact product and options. If buyers feel surprised at checkout or uncertain about what they are getting, conversion drops fast.</p>
      <p>When conversion improves, SEO usually improves with it. Focus on making each listing clearer, easier to trust, and easier to buy, then track what changes in your stats.</p>

      <h2 id="turn-orders-into-reviews">Turn Orders into Reviews</h2>
      <p>Reviews do not start after delivery. They start the moment a buyer places an order. The easiest way to earn more five star feedback is to reduce uncertainty at every step by confirming details quickly, shipping on time, and communicating early if anything changes.</p>
      <p>Response time matters more than most new sellers realize. Even a short friendly message within 24 hours can calm buyer concerns and prevent a bad experience from escalating.</p>
      <p>Shipping reliability is another big trust signal. Use accurate processing times, add tracking whenever possible, and only mark orders shipped when they are truly with the carrier. Buyers are much more likely to leave positive reviews when delivery feels predictable and professional.</p>
      <p>Small thoughtful touches help too. A simple thank you note, careful packaging, and clear expectations can turn a first order into a repeat customer.</p>

      <h2 id="build-trust-in-your-shop">Build Trust in Your Shop</h2>
      <p>Trust is what turns a maybe into a sale, especially for new shops without a long review history yet. Buyers want to feel confident that a real reliable person is behind the listing and that they know what will happen after they click purchase.</p>
      <p>Start with your shop basics. Complete your About section, add clear shop policies, and keep your profile active and consistent. These details answer silent buyer questions like: Is this shop legitimate? Will I get what I ordered? What happens if something goes wrong?</p>
      <p>Keep listing details and policies aligned so there are no surprises. Processing times, shipping expectations, return terms, and product details should all match the real experience.</p>
      <p>When your shop feels trustworthy, shoppers stay longer, ask better questions, and buy with more confidence. That trust loop supports better conversion and stronger ranking growth.</p>

      <h2 id="improve-every-month">Improve Every Month</h2>
      <p>One of the biggest mistakes new sellers make is changing everything at once, then not knowing what helped. A simple monthly rhythm works better. Review your stats, make a small set of focused updates, then give those changes time to work.</p>
      <p>Check which listings get views but low sales, and which listings get almost no visibility. Low visibility usually points to keyword or tags issues. High views with low sales usually point to conversion issues like photos, pricing, or listing clarity.</p>
      <p>Pick one or two listings to improve each month. Update keywords, tighten titles, refresh your first photo if needed, and make your description easier to scan. Then track performance for a few weeks before another round of edits so you can see what actually moved the needle.</p>
      <p>This steady approach helps shops grow without burnout. Small improvements repeated every month compound into stronger rankings and more predictable sales.</p>

      <h2 id="listing-checklist">Listing Checklist</h2>
      <p>Before you publish or republish, run this checklist so you do not miss easy wins.</p>
      <ul>
        <li>Clear title with the main keyword phrase near the front.</li>
        <li>All 13 tags used with varied phrases and no duplicate intent.</li>
        <li>Tag generation reviewed so tags match the real product and buyer intent.</li>
        <li>First photo is clean and strong enough to earn the click.</li>
        <li>Full photo set answers common buyer questions.</li>
        <li>Price and shipping are easy to understand.</li>
        <li>Description includes key details like size, material, and variations.</li>
        <li>Shop policies, About section, and processing times are complete and accurate.</li>
      </ul>
      <p>Then publish, watch your stats, and improve monthly. That rhythm is how new Etsy sellers move from inconsistent traffic to reliable sales.</p>
    `,
  },
  {
    slug: "etsy-algorithm-explained",
    title: "The Etsy Algorithm Explained: What Actually Affects Your Ranking",
    excerpt:
      "Tags, recency, reviews, shipping speed - how does Etsy's algorithm actually weigh each factor? We break down what matters most.",
    date: "Feb 14, 2026",
    category: "Strategy",
    readTime: "8 min read",
    sections: [
      { id: "ranking-signals", level: 2, title: "Core Ranking Signals" },
      { id: "listing-quality", level: 2, title: "Listing Quality Scores" },
      {
        id: "conversion-loop",
        level: 3,
        title: "The conversion feedback loop",
      },
      {
        id: "optimization-routine",
        level: 2,
        title: "A Practical Optimization Routine",
      },
      { id: "final-notes", level: 2, title: "Final Notes" },
    ],
    contentHtml: `
      <h2 id="ranking-signals">Core Ranking Signals</h2>
      <p>Etsy ranking behavior is a blend of relevance, listing quality, and customer trust indicators. Relevance decides eligibility, then engagement metrics decide which eligible listings surface first.</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer feugiat, erat sed congue pretium, ipsum ligula finibus mauris, ac hendrerit nulla nisl vel tortor.</p>

      <h2 id="listing-quality">Listing Quality Scores</h2>
      <p>Listings that convert and satisfy buyers tend to stay visible longer. Strong photos, clear shipping promises, and precise tag-to-title consistency matter together, not in isolation.</p>
      ${BLOG_IMAGE_1}

      <h3 id="conversion-loop">The conversion feedback loop</h3>
      <p>Better relevance increases qualified impressions; better messaging increases conversion; better conversion improves placement. This loop is why tiny copy improvements can outperform big pricing changes.</p>

      <h2 id="optimization-routine">A Practical Optimization Routine</h2>
      <p>Run weekly metadata reviews and monthly positioning updates. Keep one variable change per iteration when possible, so you can attribute wins to the right update.</p>
      <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Quis ipsum suspendisse ultrices gravida dictum fusce.</p>
      ${BLOG_IMAGE_2}

      <h2 id="final-notes">Final Notes</h2>
      <p>Think in systems: tags, titles, thumbnails, and reviews work best when optimized as one funnel.</p>
    `,
  },
  {
    slug: "tag-mistakes-etsy-sellers-make",
    title: "7 Tag Mistakes Etsy Sellers Make (And How to Fix Them)",
    excerpt:
      "From repeating words to ignoring long-tail phrases, these common mistakes could be costing you thousands of views per month.",
    date: "Jan 30, 2026",
    category: "Tips",
    readTime: "5 min read",
    sections: [
      {
        id: "mistake-overlap",
        level: 2,
        title: "Mistake 1: Repetitive Overlap",
      },
      { id: "mistake-generic", level: 2, title: "Mistake 2: Generic Language" },
      {
        id: "mistake-seasonal",
        level: 2,
        title: "Mistake 3: No Seasonal Coverage",
      },
      {
        id: "mistake-testing",
        level: 2,
        title: "Mistake 4: No Testing Cadence",
      },
      { id: "quick-checklist", level: 2, title: "Quick Checklist" },
    ],
    contentHtml: `
      <h2 id="mistake-overlap">Mistake 1: Repetitive Overlap</h2>
      <p>Repeating the same root word in five tags rarely adds meaningful coverage. Instead, diversify by audience, occasion, material, and style language.</p>

      <h2 id="mistake-generic">Mistake 2: Generic Language</h2>
      <p>Broad words can still appear in your set, but anchor your strongest slots to descriptive long-tail buyer intent phrases.</p>
      ${BLOG_IMAGE_1}

      <h2 id="mistake-seasonal">Mistake 3: No Seasonal Coverage</h2>
      <p>Ignoring upcoming seasonal phrases leaves discoverability on the table. Pre-season updates should happen weeks before buyer demand peaks.</p>

      <h2 id="mistake-testing">Mistake 4: No Testing Cadence</h2>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed viverra sem in sem placerat, eu eleifend velit semper. Integer dictum rhoncus neque, in bibendum mi tempor non.</p>
      ${BLOG_IMAGE_2}

      <h2 id="quick-checklist">Quick Checklist</h2>
      <p>Use 13 unique phrases, map each phrase to a buyer moment, and track performance after every update window.</p>
    `,
  },
  {
    slug: "seasonal-tags-strategy",
    title:
      "Seasonal Tag Strategy: How to Prepare Your Listings for Peak Seasons",
    excerpt:
      "Holiday shoppers are searching now. Here's how to update your tags ahead of major seasonal windows to capture peak traffic.",
    date: "Jan 12, 2026",
    category: "Strategy",
    readTime: "7 min read",
    sections: [
      { id: "season-map", level: 2, title: "Build a Seasonal Map" },
      { id: "lead-time", level: 2, title: "Use Early Lead Time" },
      { id: "calendar-system", level: 3, title: "Calendar system that scales" },
      {
        id: "content-refresh",
        level: 2,
        title: "Refresh Content Alongside Tags",
      },
      { id: "season-wrap", level: 2, title: "Season Wrap-Up" },
    ],
    contentHtml: `
      <h2 id="season-map">Build a Seasonal Map</h2>
      <p>Map your niche to major shopping events and minor intent spikes. The best seasonal tagging systems are planned quarterly, not reactively updated mid-peak.</p>
      ${BLOG_IMAGE_1}

      <h2 id="lead-time">Use Early Lead Time</h2>
      <p>Tag updates need indexing time. For major holidays, publish seasonal language at least three to five weeks before expected buyer demand.</p>

      <h3 id="calendar-system">Calendar system that scales</h3>
      <p>Create a simple grid with target phrases, publish date, performance notes, and next review date. This keeps your cadence repeatable as your catalog grows.</p>

      <h2 id="content-refresh">Refresh Content Alongside Tags</h2>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Neque convallis a cras semper auctor neque vitae tempus quam pellentesque.</p>
      ${BLOG_IMAGE_2}

      <h2 id="season-wrap">Season Wrap-Up</h2>
      <p>At season end, archive winners and carry evergreen phrases into your baseline set.</p>
    `,
  },
  {
    slug: "long-tail-keywords-etsy",
    title: "Long-Tail Keywords: The Secret to Etsy Visibility for New Shops",
    excerpt:
      "Competing with established shops is hard, but with the right long-tail strategy even new listings can get discovered quickly.",
    date: "Dec 20, 2025",
    category: "SEO",
    readTime: "6 min read",
    sections: [
      { id: "new-shop-constraint", level: 2, title: "The New-Shop Constraint" },
      { id: "phrase-clusters", level: 2, title: "Build Phrase Clusters" },
      { id: "competition-layer", level: 3, title: "Competition layering" },
      { id: "launch-plan", level: 2, title: "30-Day Launch Plan" },
      { id: "final-check", level: 2, title: "Final Check" },
    ],
    contentHtml: `
      <h2 id="new-shop-constraint">The New-Shop Constraint</h2>
      <p>New shops usually cannot compete on broad category phrases, so precision is the only reliable early advantage.</p>

      <h2 id="phrase-clusters">Build Phrase Clusters</h2>
      <p>Group phrases by who, what, and occasion. A strong tag set includes at least one phrase for each cluster so you cover multiple entry paths.</p>
      ${BLOG_IMAGE_1}

      <h3 id="competition-layer">Competition layering</h3>
      <p>Mix medium-competition phrases with niche low-competition variants. This balances discoverability with realistic ranking potential.</p>

      <h2 id="launch-plan">30-Day Launch Plan</h2>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus efficitur volutpat ligula, a porta lorem posuere non. Duis et mauris massa. Curabitur aliquam gravida risus, sed faucibus dui dignissim sed.</p>
      ${BLOG_IMAGE_2}

      <h2 id="final-check">Final Check</h2>
      <p>Keep your language buyer-first, track every change, and iterate quickly on early listing data.</p>
    `,
  },
  {
    slug: "ai-tags-vs-manual-research",
    title: "AI-Generated Tags vs Manual Research: Which Gets More Views?",
    excerpt:
      "We ran a multi-listing test to compare AI tag generation against traditional manual keyword workflows.",
    date: "Dec 5, 2025",
    category: "Research",
    readTime: "9 min read",
    sections: [
      { id: "test-design", level: 2, title: "Test Design" },
      { id: "results-summary", level: 2, title: "Results Summary" },
      { id: "quality-variance", level: 3, title: "Quality variance by niche" },
      { id: "workflow-choice", level: 2, title: "Choosing Your Workflow" },
      { id: "takeaways", level: 2, title: "Key Takeaways" },
    ],
    contentHtml: `
      <h2 id="test-design">Test Design</h2>
      <p>We compared two workflows across multiple listing groups: manual-only research versus AI-assisted generation with human review.</p>
      <p>Both groups used identical pricing, image quality standards, and listing update cadence to reduce confounding factors.</p>

      <h2 id="results-summary">Results Summary</h2>
      <p>The AI-assisted group reached qualified impressions faster, while manual workflows occasionally produced stronger niche nuance when category expertise was high.</p>
      ${BLOG_IMAGE_1}

      <h3 id="quality-variance">Quality variance by niche</h3>
      <p>Highly technical categories benefited from extra manual edits, while lifestyle/gift categories saw stronger consistency from AI-assisted first drafts.</p>

      <h2 id="workflow-choice">Choosing Your Workflow</h2>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nibh mauris cursus mattis molestie a iaculis at erat. Mauris pellentesque pulvinar pellentesque habitant morbi tristique senectus et netus.</p>
      ${BLOG_IMAGE_2}

      <h2 id="takeaways">Key Takeaways</h2>
      <p>The best practical approach is hybrid: AI for speed and breadth, human review for brand and category precision.</p>
    `,
  },
];

export function listBlogPosts(): BlogPost[] {
  return BLOG_POSTS;
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
