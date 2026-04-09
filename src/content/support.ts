export type SupportIconKey =
  | "user"
  | "credit-card"
  | "sparkles"
  | "rotate-ccw"
  | "tag"
  | "shopping-cart"
  | "help-circle";

export type SupportTopic = {
  slug: string;
  icon: SupportIconKey;
  name: string;
  description: string;
  color: string;
};

export type SupportArticle = {
  slug: string;
  topic: string;
  title: string;
  contentHtml: string;
  relatedSlugs: string[];
};

export const SUPPORT_TOPICS: SupportTopic[] = [
  {
    slug: "account",
    icon: "user",
    name: "Account & Profile",
    description: "Login, password, email verification, and account settings.",
    color: "bg-blue-100 text-blue-600",
  },
  {
    slug: "billing",
    icon: "credit-card",
    name: "Billing & Payments",
    description: "Plans, checkout issues, invoices, renewals, and refunds.",
    color: "bg-green-100 text-green-600",
  },
  {
    slug: "tag-generation",
    icon: "sparkles",
    name: "Tag Generation",
    description: "How generation works, output usage, and tag quality improvements.",
    color: "bg-orange-100 text-stone-900",
  },
  {
    slug: "getting-started",
    icon: "rotate-ccw",
    name: "Getting Started",
    description: "Setup, first generation, and launch-day basics.",
    color: "bg-purple-100 text-purple-600",
  },
  {
    slug: "etsy-workflow",
    icon: "shopping-cart",
    name: "Etsy Workflow",
    description: "How to apply tags in listings and track results.",
    color: "bg-amber-100 text-amber-600",
  },
  {
    slug: "troubleshooting",
    icon: "help-circle",
    name: "Troubleshooting",
    description: "Fix common errors, timeouts, and checkout return issues.",
    color: "bg-stone-100 text-stone-900",
  },
];

export const SUPPORT_ARTICLES: SupportArticle[] = [
  {
    slug: "login-issues",
    topic: "account",
    title: "I cannot log in to my account",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this when your account exists but sign-in keeps failing. This usually comes from a password mismatch, the wrong email, or a stale browser session.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Type your login email manually and confirm there are no extra spaces before or after it.</li>
        <li>Try one careful password attempt. If it fails, stop guessing and use reset to avoid lockout behavior.</li>
        <li>Open a private browser window and sign in there. If that works, clear cookies for this site in your normal browser.</li>
        <li>If you use Google sign-in, click the same method you used when you created the account.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>Go to <a href="/support/contact">Contact Support</a> with the email you are trying, the exact error text, and the local time of your last attempt.</p>

      <h2>Related next step</h2>
      <p>If you are unsure whether the password is correct, start with the password reset guide below.</p>
    `,
    relatedSlugs: ["reset-password", "verify-email-address", "common-error-messages"],
  },
  {
    slug: "reset-password",
    topic: "account",
    title: "How to reset your password",
    contentHtml: `
      <h2>Reset Steps</h2>
      <p>Use this flow when your password fails or you need to replace it. Run it once from start to finish before troubleshooting. Most failures come from interrupted attempts or using an older reset email.</p>
      <ol>
        <li>Open <a href="/login">Log in</a> and choose <strong>Reset password</strong>.</li>
        <li>Enter your account email carefully and submit one request.</li>
        <li>Open the reset email and use the newest reset link.</li>
        <li>Set a new password you have not used recently.</li>
        <li>Return to login and sign in with the new password.</li>
      </ol>
      <p>After sign-in, validate quickly: new password works, old password fails, and a second login attempt succeeds in the same browser session. This check confirms both credential update and session continuity.</p>

      <h2>Can’t find the email?</h2>
      <p>If the reset password email does not arrive, check spam and filtered folders, then verify the submitted address exactly matches your account email. If the link opens but reset does not complete, the link may be stale. Retry in this order: wait up to 10 minutes, submit one fresh reset request, open only the newest email, and complete the password change immediately. Do not run multiple reset attempts from different devices at the same time while troubleshooting.</p>
    `,
    relatedSlugs: ["login-issues", "verify-email-address", "update-account-email"],
  },
  {
    slug: "verify-email-address",
    topic: "account",
    title: "How email verification works",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Email verification confirms you control the account address. Some actions may stay blocked until this is complete.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Open the latest verification email and click the confirmation link once.</li>
        <li>Use the same browser where you normally sign in so session handoff is clean.</li>
        <li>After redirect, refresh your account page to confirm verification status updated.</li>
        <li>If you have multiple verification emails, use the newest one only.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If the link is expired or broken, request a fresh verification email and try again. If it still fails, contact <a href="/support/contact">Support</a> with a screenshot.</p>

      <h2>Related next step</h2>
      <p>If you no longer have access to the old inbox, follow the account email update steps next.</p>
    `,
    relatedSlugs: ["login-issues", "reset-password", "common-error-messages"],
  },
  {
    slug: "update-account-email",
    topic: "account",
    title: "How to update your account email",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this when your current login email is outdated or you want billing notices sent to a new address.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Go to account settings and open the email section.</li>
        <li>Enter the new address carefully and save changes.</li>
        <li>Confirm the change through the verification email sent to the new inbox.</li>
        <li>Log out and back in once with the new email so future sessions use the updated address.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If you cannot access either old or new inbox, contact <a href="/support/contact">Support</a> from a signed-in session if possible so we can verify ownership faster.</p>

      <h2>Related next step</h2>
      <p>After changing email, check billing receipts and invoice delivery in your billing settings.</p>
    `,
    relatedSlugs: ["verify-email-address", "invoices-cancellations-and-renewals", "login-issues"],
  },
  {
    slug: "plans-and-credits",
    topic: "billing",
    title: "Plans, credits, and generation limits",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this if you are unsure what your plan includes, how credits are consumed, or why generation is blocked.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Open billing settings and confirm your active plan tier.</li>
        <li>Check remaining credits and monthly reset date.</li>
        <li>Compare your recent generation usage to plan limits.</li>
        <li>If you are near the cap, upgrade before starting a large batch so work is not interrupted.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If your balance looks wrong, contact <a href="/support/contact">Support</a> with your account email and the approximate time of the affected generations.</p>

      <h2>Related next step</h2>
      <p>If checkout failed while changing plans, use the checkout failures article next.</p>
    `,
    relatedSlugs: ["checkout-and-payment-failures", "invoices-cancellations-and-renewals", "how-tag-generation-works"],
  },
  {
    slug: "checkout-and-payment-failures",
    topic: "billing",
    title: "Checkout and payment failures",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this when checkout does not complete, card payment fails, or you are returned without a plan update.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Retry once from a fresh tab and avoid multiple rapid payment attempts.</li>
        <li>Confirm card details, billing ZIP, and card security code are current.</li>
        <li>Disable VPN or strict browser extensions during checkout, then try again.</li>
        <li>If your bank declines the payment, approve it with your bank first and retry.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If you see a pending charge but no plan update, contact <a href="/support/contact">Support</a> with the charge amount and timestamp so we can trace the session.</p>

      <h2>Related next step</h2>
      <p>If checkout completed but the app did not resume your request, follow the checkout return troubleshooting guide.</p>
    `,
    relatedSlugs: ["plans-and-credits", "checkout-return-did-not-resume", "common-error-messages"],
  },
  {
    slug: "invoices-cancellations-and-renewals",
    topic: "billing",
    title: "Invoices, cancellations, and renewals",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this for invoice downloads, cancellation timing questions, or renewal date confusion.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Open billing settings and review your current plan status and next renewal date.</li>
        <li>Download invoices directly from the billing history section for bookkeeping.</li>
        <li>If you plan to cancel, submit cancellation before the next renewal date to avoid another cycle charge.</li>
        <li>After any billing change, refresh the page and confirm the new status is shown.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If invoice records are missing or status does not match recent changes, contact <a href="/support/contact">Support</a> with your account email and billing date.</p>

      <h2>Related next step</h2>
      <p>If you need a refund review, follow the refund request article next.</p>
    `,
    relatedSlugs: ["refund-requests", "plans-and-credits", "update-account-email"],
  },
  {
    slug: "refund-requests",
    topic: "billing",
    title: "How refund requests are handled",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this to understand how to submit a refund request, what details are needed, and what response timeline to expect.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Gather your account email, payment date, and the exact charge amount.</li>
        <li>Write a short reason for the request and what outcome you are asking for.</li>
        <li>Submit the request through <a href="/support/contact">Contact Support</a>.</li>
        <li>Watch your inbox for follow-up questions so the review does not stall.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If you do not receive a reply within the normal support window, resend the request with the original details and subject line so we can locate the case quickly.</p>

      <h2>Related next step</h2>
      <p>For renewal or cancellation timing questions, check the invoices and renewals guide.</p>
    `,
    relatedSlugs: ["invoices-cancellations-and-renewals", "checkout-and-payment-failures", "plans-and-credits"],
  },
  {
    slug: "how-tag-generation-works",
    topic: "tag-generation",
    title: "How Tagloom tag generation works",
    contentHtml: `
      <h2>What this solves</h2>
      <p>This explains what the generator uses as input and why output can change when your listing details change.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Start with a clear listing title, product type, material, and audience in your input.</li>
        <li>Include useful detail in your description so the model can infer buyer intent.</li>
        <li>Review output for relevance first, then remove duplicates and off-topic phrases.</li>
        <li>Use the set as a draft and adapt it to your exact listing language before publishing.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If output is repeatedly off-topic, shorten your input to core facts and rerun. If quality is still poor, send an example to <a href="/support/contact">Support</a>.</p>

      <h2>Related next step</h2>
      <p>Next, review how to improve output quality with stronger input patterns.</p>
    `,
    relatedSlugs: ["improve-tag-output-quality", "understanding-target-vs-discovery-tags", "first-generation-walkthrough"],
  },
  {
    slug: "improve-tag-output-quality",
    topic: "tag-generation",
    title: "How to improve tag output quality",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this when generated tags are too broad, repetitive, or not aligned with what your product actually is.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Replace vague input words like “cute” with specific words such as material, use case, and style.</li>
        <li>Add size or recipient details if they are important to buyer searches.</li>
        <li>Rerun and compare results, then keep the strongest phrases from each run.</li>
        <li>Check the final set against your title and first description lines so wording matches.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If quality still looks weak after two focused reruns, pause and audit listing clarity first. Then contact <a href="/support/contact">Support</a> with your input and output sample.</p>

      <h2>Related next step</h2>
      <p>Use the weekly refresh routine to improve tags over time instead of rewriting everything at once.</p>
    `,
    relatedSlugs: ["how-tag-generation-works", "first-generation-walkthrough", "weekly-tag-refresh-routine"],
  },
  {
    slug: "understanding-target-vs-discovery-tags",
    topic: "tag-generation",
    title: "Target tags vs discovery tags",
    contentHtml: `
      <h2>What this solves</h2>
      <p>This helps you balance focused phrases for ready-to-buy shoppers and broader phrases that help new shoppers discover your listing.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Use target tags for exact buyer intent, like product type plus recipient or occasion.</li>
        <li>Use discovery tags for nearby search paths that are still relevant to your product.</li>
        <li>Avoid filling all slots with only broad terms or only narrow terms.</li>
        <li>Recheck that each tag has distinct meaning and is not a small variation of another slot.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If your listing gets impressions but weak clicks, tighten target tags. If impressions are very low, expand discovery coverage carefully.</p>

      <h2>Related next step</h2>
      <p>After balancing both groups, copy tags into Etsy and monitor early changes.</p>
    `,
    relatedSlugs: ["how-tag-generation-works", "copy-and-paste-tags-into-etsy", "why-generated-tags-may-not-rank-yet"],
  },
  {
    slug: "why-generated-tags-may-not-rank-yet",
    topic: "tag-generation",
    title: "Why generated tags may not rank yet",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this when you updated tags but results are flat. Ranking changes usually need time and listing quality support.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Wait long enough to collect useful data before changing tags again.</li>
        <li>Confirm your first image and title match the same search intent as your tags.</li>
        <li>Review conversion basics like shipping clarity and price positioning.</li>
        <li>Track one change batch at a time so you can see what actually helped.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If no movement after a full review cycle, refresh the weakest tags and test again. If performance is still stuck, contact <a href="/support/contact">Support</a> with listing context.</p>

      <h2>Related next step</h2>
      <p>Follow the weekly refresh routine for small, consistent iterations.</p>
    `,
    relatedSlugs: ["understanding-target-vs-discovery-tags", "weekly-tag-refresh-routine", "generation-request-failed"],
  },
  {
    slug: "account-setup-checklist",
    topic: "getting-started",
    title: "Account setup checklist",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this before your first generation to make sure account setup is complete and billing blockers do not interrupt your workflow.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Verify your email so security checks are complete.</li>
        <li>Confirm you can sign in and out successfully on your main browser.</li>
        <li>Review billing status and make sure plan limits match your expected usage.</li>
        <li>Open one test listing draft so you have input ready for your first run.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If setup fails on a specific step, stop there and fix it before moving on. Use <a href="/support/contact">Support</a> with the exact step name and error text.</p>

      <h2>Related next step</h2>
      <p>Once setup is done, move to the first generation checklist.</p>
    `,
    relatedSlugs: ["first-generation-checklist", "launch-week-basics", "login-issues"],
  },
  {
    slug: "first-generation-checklist",
    topic: "getting-started",
    title: "First generation checklist",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this to run your first generation cleanly and avoid common mistakes that lower output quality.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Prepare a clear title and short product summary before you click Generate.</li>
        <li>Run one generation and review all tags for product fit and duplicate intent.</li>
        <li>Save the strongest set and note what input produced it.</li>
        <li>Apply tags to one listing first, then monitor performance before large rollouts.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If first output looks off, improve your input detail and rerun once. If still off, use the tag quality article or contact <a href="/support/contact">Support</a>.</p>

      <h2>Related next step</h2>
      <p>After first success, use launch week basics to plan small, steady updates.</p>
    `,
    relatedSlugs: ["account-setup-checklist", "how-tag-generation-works", "copy-and-paste-tags-into-etsy"],
  },
  {
    slug: "launch-week-basics",
    topic: "getting-started",
    title: "Launch week basics",
    contentHtml: `
      <h2>What this solves</h2>
      <p>This gives you a simple first-week plan so you can improve listings without over-editing and losing track of changes.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Pick a small set of listings for week one updates.</li>
        <li>Improve tags and title clarity first, then leave listings alone long enough to gather data.</li>
        <li>Check clicks and sales at the end of the week instead of reacting daily.</li>
        <li>Carry forward what worked into week two and pause changes that did not help.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If results are noisy, reduce how many listings you edit at once. If you need help picking priorities, contact <a href="/support/contact">Support</a>.</p>

      <h2>Related next step</h2>
      <p>Use the weekly tag refresh routine to keep the same cadence after launch week.</p>
    `,
    relatedSlugs: ["first-generation-checklist", "weekly-tag-refresh-routine", "plans-and-credits"],
  },
  {
    slug: "map-tags-to-your-listing",
    topic: "etsy-workflow",
    title: "Map tags to your Etsy listing",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this when you have good generated tags but are not sure how to place them into Etsy in a way that supports ranking.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Paste tags into Etsy slots one by one and confirm each slot is unique.</li>
        <li>Keep tag wording aligned with your title and opening description lines.</li>
        <li>Avoid stuffing the same root phrase across multiple slots.</li>
        <li>After saving, preview the listing and check that copy still reads naturally.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If indexing looks weak, tighten relevance and remove low-intent phrases. If you are unsure what to cut, contact <a href="/support/contact">Support</a> with your current set.</p>

      <h2>Related next step</h2>
      <p>After mapping tags, review your click and sale tracking approach.</p>
    `,
    relatedSlugs: ["copy-and-paste-tags-into-etsy", "understanding-target-vs-discovery-tags", "weekly-tag-refresh-routine"],
  },
  {
    slug: "update-listings-without-overhauling",
    topic: "etsy-workflow",
    title: "Update listings without overhauling everything",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this when you want better results but do not want to rewrite entire listings and lose track of what changed.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Choose one listing element per pass, such as tags first, then title later.</li>
        <li>Run updates on a small batch so you can compare before and after clearly.</li>
        <li>Wait for data, then keep only the changes that improved clicks or sales.</li>
        <li>Document each update date so future decisions are based on evidence.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If nothing improves after a full cycle, audit product-market fit and listing visuals, then contact <a href="/support/contact">Support</a> for targeted review.</p>

      <h2>Related next step</h2>
      <p>Track post-update performance to decide your next change with confidence.</p>
    `,
    relatedSlugs: ["weekly-tag-refresh-routine", "why-generated-tags-may-not-rank-yet", "generation-request-failed"],
  },
  {
    slug: "track-clicks-and-sales-after-tag-updates",
    topic: "etsy-workflow",
    title: "Track clicks and sales after tag updates",
    contentHtml: `
      <h2>What this solves</h2>
      <p>This helps you measure whether a tag update worked. Clicks show interest, and sales show conversion, which means a visitor completed a purchase.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Record baseline clicks and sales before changing anything.</li>
        <li>Apply updates to a limited group of listings and note the date.</li>
        <li>Check results after a reasonable window instead of day-to-day fluctuations.</li>
        <li>Keep updates that improve both visibility and sales quality, not just raw traffic.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If clicks rise but sales stay flat, your mismatch is usually pricing, photos, or clarity. Address those first, then retest tags.</p>

      <h2>Related next step</h2>
      <p>If the numbers are unclear, use launch week basics to reset your measurement cadence.</p>
    `,
    relatedSlugs: ["update-listings-without-overhauling", "launch-week-basics", "common-error-messages"],
  },
  {
    slug: "first-generation-walkthrough",
    topic: "tag-generation",
    title: "Your first generation walkthrough",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this guided pass if you want a clean first run and a repeatable process for future listings.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Gather listing title, material, style, audience, and occasion details before starting.</li>
        <li>Run generation and scan for relevance, duplicates, and phrases that do not match your item.</li>
        <li>Save strong phrases and remove weak ones before copying to Etsy.</li>
        <li>Keep notes on what input gave your best result so you can reuse the pattern.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If your first pass is noisy, simplify the input and rerun once. If quality is still inconsistent, contact <a href="/support/contact">Support</a> with examples.</p>

      <h2>Related next step</h2>
      <p>After this walkthrough, move to copy and paste workflow for Etsy slot placement.</p>
    `,
    relatedSlugs: ["how-tag-generation-works", "copy-and-paste-tags-into-etsy", "improve-tag-output-quality"],
  },
  {
    slug: "copy-and-paste-tags-into-etsy",
    topic: "tag-generation",
    title: "How to copy and paste tags into Etsy",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this when your generated set is ready and you want to transfer it to Etsy quickly without introducing errors.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Click Copy All in Tagloom after final review.</li>
        <li>Open the Etsy listing editor and paste into tag slots carefully.</li>
        <li>Check for duplicates, cut-offs, or pasted punctuation that changes meaning.</li>
        <li>Save the listing and re-open once to confirm tags persisted as expected.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If tags do not save, refresh Etsy editor and try again in a clean browser tab. If the problem continues, capture a screenshot and contact <a href="/support/contact">Support</a>.</p>

      <h2>Related next step</h2>
      <p>Use the workflow tracking article to measure what changed after publishing.</p>
    `,
    relatedSlugs: ["understanding-target-vs-discovery-tags", "first-generation-walkthrough", "weekly-tag-refresh-routine"],
  },
  {
    slug: "save-and-repeat-your-best-inputs",
    topic: "tag-generation",
    title: "Save and repeat your best inputs",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this to build consistency across listings and stop restarting from scratch each time you generate tags.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Save a short template from listings that produced strong tags and solid sales.</li>
        <li>Reuse that template for similar products and adjust only product-specific details.</li>
        <li>Keep a simple note on which prompt versions performed best.</li>
        <li>Review monthly and retire templates that no longer produce relevant output.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If repeated inputs start underperforming, your niche language may have shifted. Refresh core wording and test new variants in small batches.</p>

      <h2>Related next step</h2>
      <p>Use the weekly routine to keep improving without major rewrites.</p>
    `,
    relatedSlugs: ["first-generation-walkthrough", "improve-tag-output-quality", "weekly-tag-refresh-routine"],
  },
  {
    slug: "weekly-tag-refresh-routine",
    topic: "tag-generation",
    title: "A weekly tag refresh routine",
    contentHtml: `
      <h2>What this solves</h2>
      <p>This gives you a repeatable weekly system for improving tags while keeping your workload manageable.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Pick a small number of listings with weak performance for this week.</li>
        <li>Refresh tags for those listings only and log the changes.</li>
        <li>Wait, then review clicks and sales to see whether quality improved.</li>
        <li>Keep winners, remove weak changes, and repeat next week with a new batch.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If updates are not moving results, revisit listing photos, pricing, and description clarity. Tags help discovery, but sales require full listing trust.</p>

      <h2>Related next step</h2>
      <p>Use plans and credits to ensure your weekly cadence fits your account limits.</p>
    `,
    relatedSlugs: ["save-and-repeat-your-best-inputs", "why-generated-tags-may-not-rank-yet", "plans-and-credits"],
  },
  {
    slug: "generation-request-failed",
    topic: "troubleshooting",
    title: "Generation request failed",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this when generation returns an error immediately or fails after you submit input.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Retry once after a short pause to rule out a temporary network glitch.</li>
        <li>Shorten very long input and remove unusual characters that may break requests.</li>
        <li>Confirm your account still has available credits and active billing status.</li>
        <li>Run again in a private browser window to isolate extension conflicts.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>Contact <a href="/support/contact">Support</a> with the exact error message, timestamp, and whether the same input fails repeatedly.</p>

      <h2>Related next step</h2>
      <p>If requests are slow before failing, use the timeout guide next.</p>
    `,
    relatedSlugs: ["slow-responses-and-timeouts", "common-error-messages", "how-tag-generation-works"],
  },
  {
    slug: "slow-responses-and-timeouts",
    topic: "troubleshooting",
    title: "Slow responses and timeouts",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this when requests spin for too long, timeout, or finish only after repeated retries.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Check your internet stability and avoid running many heavy browser tabs at the same time.</li>
        <li>Retry once with shorter input to reduce processing load.</li>
        <li>Disable VPN and strict content blockers that may interrupt long requests.</li>
        <li>If the page stalls, refresh once and retry from saved input.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If delays continue across devices, contact <a href="/support/contact">Support</a> with your browser, region, and the local time of recent timeouts.</p>

      <h2>Related next step</h2>
      <p>If timeout happens after checkout return, use the checkout resume article next.</p>
    `,
    relatedSlugs: ["generation-request-failed", "checkout-return-did-not-resume", "common-error-messages"],
  },
  {
    slug: "checkout-return-did-not-resume",
    topic: "troubleshooting",
    title: "Checkout returned but generation did not resume",
    contentHtml: `
      <h2>What this solves</h2>
      <p>Use this when payment succeeds but you return to the app and your pending generation does not continue.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>Wait a moment and refresh once to let billing status sync.</li>
        <li>Confirm the account shown in the app matches the one used for checkout.</li>
        <li>Open billing settings to verify the plan or credits were applied.</li>
        <li>Re-run the generation request manually from saved input.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>If payment posted but generation still cannot run, contact <a href="/support/contact">Support</a> with the charge time and checkout email so we can reconcile session state.</p>

      <h2>Related next step</h2>
      <p>If checkout itself keeps failing, use the payment failure article.</p>
    `,
    relatedSlugs: ["checkout-and-payment-failures", "generation-request-failed", "plans-and-credits"],
  },
  {
    slug: "common-error-messages",
    topic: "troubleshooting",
    title: "Common error messages and what they mean",
    contentHtml: `
      <h2>What this solves</h2>
      <p>This helps you quickly map common errors to the right fix path so you do not waste time trying unrelated steps.</p>

      <h2>How to fix it</h2>
      <ol>
        <li>If the error mentions auth, confirm login state, verification status, and account email.</li>
        <li>If the error mentions billing, verify plan status, credits, and recent checkout results.</li>
        <li>If the error mentions request or timeout, follow network and retry steps in troubleshooting articles.</li>
        <li>Always capture the full error text and timestamp before refreshing.</li>
      </ol>

      <h2>If this didn’t work</h2>
      <p>When the same error repeats after the relevant fix path, contact <a href="/support/contact">Support</a> with screenshot evidence and recent actions.</p>

      <h2>Related next step</h2>
      <p>Choose the related article below that matches your error category and continue from there.</p>
    `,
    relatedSlugs: ["login-issues", "checkout-and-payment-failures", "generation-request-failed"],
  },
];

export function listSupportTopics(): SupportTopic[] {
  return SUPPORT_TOPICS;
}

export function getSupportTopicBySlug(slug: string): SupportTopic | undefined {
  return SUPPORT_TOPICS.find((topic) => topic.slug === slug);
}

export function listSupportArticles(): SupportArticle[] {
  return SUPPORT_ARTICLES;
}

export function getSupportArticleBySlug(slug: string): SupportArticle | undefined {
  return SUPPORT_ARTICLES.find((article) => article.slug === slug);
}

export function getSupportArticleByTopicAndSlug(topic: string, slug: string): SupportArticle | undefined {
  return SUPPORT_ARTICLES.find(
    (article) => article.topic === topic && article.slug === slug,
  );
}

export function listSupportArticlesByTopic(topic: string): SupportArticle[] {
  return SUPPORT_ARTICLES.filter((article) => article.topic === topic);
}
