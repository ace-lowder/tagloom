export type BlogCategory = "SEO" | "Strategy" | "Tips" | "Research";

export type BlogSection = {
  id: string;
  level: 2 | 3;
  title: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: BlogCategory;
  readTime: string;
  contentHtml: string;
  sections: BlogSection[];
};

const BLOG_IMAGE_1 = `<img src="/blog-inline-1.svg" alt="Tag strategy planning board" />`;
const BLOG_IMAGE_2 = `<img src="/blog-inline-2.svg" alt="Etsy search trend dashboard" />`;

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-rank-higher-on-etsy",
    title: "How to Rank Higher on Etsy with the Right Tags",
    excerpt:
      "Etsy search is driven by tags. Learn which tag strategies consistently outperform the competition and how AI can accelerate your research.",
    date: "Feb 28, 2026",
    category: "SEO",
    readTime: "6 min read",
    sections: [
      { id: "why-tags-matter", level: 2, title: "Why Tags Matter More Than You Think" },
      { id: "how-etsy-uses-tags", level: 2, title: "How Etsy Uses Your Tags" },
      { id: "long-tail-vs-broad", level: 3, title: "Long-tail vs. broad tags" },
      { id: "keyword-research", level: 2, title: "Doing Keyword Research Right" },
      { id: "ai-approach", level: 2, title: "The AI Approach to Tags" },
      { id: "testing-and-iterating", level: 2, title: "Testing and Iterating" },
      { id: "conclusion", level: 2, title: "Conclusion" },
    ],
    contentHtml: `
      <h2 id="why-tags-matter">Why Tags Matter More Than You Think</h2>
      <p>When someone searches on Etsy, the platform scans your listing title, tags, and attributes to estimate relevance. Tags are the clearest signal you control directly, and they influence whether your listing appears for long-tail buyer intent searches.</p>
      <p>Most sellers still use generic tags and repeated words that do not expand coverage. Strong tagging strategy means spreading intent coverage across niche phrases without sacrificing clarity.</p>
      ${BLOG_IMAGE_1}

      <h2 id="how-etsy-uses-tags">How Etsy Uses Your Tags</h2>
      <p>Etsy combines listing quality and relevance, and relevance is mostly language matching. Tags that mirror how buyers phrase their needs tend to outperform broad single-word tags over time.</p>
      <h3 id="long-tail-vs-broad">Long-tail vs. broad tags</h3>
      <p>A broad tag like <em>mug</em> competes against huge catalogs. A phrase like <em>hand thrown ceramic mug</em> has clearer intent, lower competition, and often better conversion quality.</p>

      <h2 id="keyword-research">Doing Keyword Research Right</h2>
      <p>Start with autocomplete, note phrase patterns, and audit top listings in your category for overlap and gaps. Keep a shortlist by buyer persona and shopping context to avoid repetitive tags.</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.</p>
      ${BLOG_IMAGE_2}

      <h2 id="ai-approach">The AI Approach to Tags</h2>
      <p>AI speeds synthesis and helps rephrase weak candidates into cleaner buyer-language phrases. It should support your strategy, not replace validation against real listing data.</p>

      <h2 id="testing-and-iterating">Testing and Iterating</h2>
      <p>Track listing stats after each tag update window, then rotate the weakest performers every few weeks. Keep snapshots of each tag set so you can correlate traffic changes with language edits.</p>

      <h2 id="conclusion">Conclusion</h2>
      <p>Strategic, buyer-focused tags are one of the highest-leverage inputs in Etsy SEO; consistent testing and cleaner phrasing compounds results over time.</p>
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
      { id: "conversion-loop", level: 3, title: "The conversion feedback loop" },
      { id: "optimization-routine", level: 2, title: "A Practical Optimization Routine" },
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
      { id: "mistake-overlap", level: 2, title: "Mistake 1: Repetitive Overlap" },
      { id: "mistake-generic", level: 2, title: "Mistake 2: Generic Language" },
      { id: "mistake-seasonal", level: 2, title: "Mistake 3: No Seasonal Coverage" },
      { id: "mistake-testing", level: 2, title: "Mistake 4: No Testing Cadence" },
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
    title: "Seasonal Tag Strategy: How to Prepare Your Listings for Peak Seasons",
    excerpt:
      "Holiday shoppers are searching now. Here's how to update your tags ahead of major seasonal windows to capture peak traffic.",
    date: "Jan 12, 2026",
    category: "Strategy",
    readTime: "7 min read",
    sections: [
      { id: "season-map", level: 2, title: "Build a Seasonal Map" },
      { id: "lead-time", level: 2, title: "Use Early Lead Time" },
      { id: "calendar-system", level: 3, title: "Calendar system that scales" },
      { id: "content-refresh", level: 2, title: "Refresh Content Alongside Tags" },
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
