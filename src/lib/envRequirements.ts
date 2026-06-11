// === Constants ===

export type EnvRequirement = {
  key: string;
  category: EnvCategory;
  requiredForProduction: boolean;
  recommendedForLaunch?: boolean;
  description: string;
};

export type EnvCategory =
  | "Supabase"
  | "OpenAI"
  | "Stripe"
  | "Rate limit / bot checks"
  | "Site + analytics"
  | "Email/support"
  | "Playwright/local smoke";

export const ENV_REQUIREMENTS: EnvRequirement[] = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    category: "Supabase",
    requiredForProduction: true,
    description: "Supabase project URL used by browser and server clients.",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    category: "Supabase",
    requiredForProduction: true,
    description: "Supabase anon key used by auth and server session clients.",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    category: "Supabase",
    requiredForProduction: true,
    description: "Service role key used by admin, support, feedback, and webhook flows.",
  },
  {
    key: "OPENAI_API_KEY",
    category: "OpenAI",
    requiredForProduction: true,
    description: "OpenAI key used for production tag generation.",
  },
  {
    key: "OPENAI_MODEL",
    category: "OpenAI",
    requiredForProduction: true,
    description: "Explicit model pin for predictable production generation behavior.",
  },
  {
    key: "STRIPE_SECRET_KEY",
    category: "Stripe",
    requiredForProduction: true,
    description: "Stripe API key used for checkout, portal, and webhook lookups.",
  },
  {
    key: "STRIPE_WEBHOOK_SECRET",
    category: "Stripe",
    requiredForProduction: true,
    description: "Stripe endpoint secret used to verify webhook signatures.",
  },
  {
    key: "STRIPE_SINGLE_USE_PRICE_ID",
    category: "Stripe",
    requiredForProduction: true,
    description: "Single-use generation price id.",
  },
  {
    key: "STRIPE_MONTHLY_PRICE_ID",
    category: "Stripe",
    requiredForProduction: true,
    description: "Monthly subscription price id.",
  },
  {
    key: "STRIPE_YEARLY_PRICE_ID",
    category: "Stripe",
    requiredForProduction: true,
    description: "Yearly subscription price id.",
  },
  {
    key: "STRIPE_SUCCESS_URL",
    category: "Stripe",
    requiredForProduction: false,
    recommendedForLaunch: true,
    description: "Explicit checkout success return URL.",
  },
  {
    key: "STRIPE_CANCEL_URL",
    category: "Stripe",
    requiredForProduction: false,
    recommendedForLaunch: true,
    description: "Explicit checkout cancel return URL.",
  },
  {
    key: "STRIPE_BILLING_RETURN_URL",
    category: "Stripe",
    requiredForProduction: false,
    recommendedForLaunch: true,
    description: "Explicit billing portal return URL.",
  },
  {
    key: "STRIPE_STARTER_UPGRADE_COUPON_ID",
    category: "Stripe",
    requiredForProduction: false,
    description: "Optional starter upgrade coupon id.",
  },
  {
    key: "UPSTASH_REDIS_REST_URL",
    category: "Rate limit / bot checks",
    requiredForProduction: true,
    description: "Upstash REST URL used by API rate limits.",
  },
  {
    key: "UPSTASH_REDIS_REST_TOKEN",
    category: "Rate limit / bot checks",
    requiredForProduction: true,
    description: "Upstash REST token used by API rate limits.",
  },
  {
    key: "TURNSTILE_SECRET_KEY",
    category: "Rate limit / bot checks",
    requiredForProduction: true,
    description: "Turnstile secret used to verify bot-check tokens.",
  },
  {
    key: "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    category: "Rate limit / bot checks",
    requiredForProduction: true,
    description: "Turnstile site key used by browser challenge widgets.",
  },
  {
    key: "NEXT_PUBLIC_SITE_URL",
    category: "Site + analytics",
    requiredForProduction: true,
    description: "Canonical site URL used by metadata, sitemap, robots, and redirects.",
  },
  {
    key: "NEXT_PUBLIC_GA_MEASUREMENT_ID",
    category: "Site + analytics",
    requiredForProduction: false,
    recommendedForLaunch: true,
    description: "GA4 measurement id for launch traffic visibility.",
  },
  {
    key: "RESEND_API_KEY",
    category: "Email/support",
    requiredForProduction: true,
    description: "Resend API key used by support contact sends.",
  },
  {
    key: "SUPPORT_FROM_EMAIL",
    category: "Email/support",
    requiredForProduction: true,
    description: "Verified support sender address.",
  },
  {
    key: "SUPPORT_TO_EMAIL",
    category: "Email/support",
    requiredForProduction: true,
    description: "Destination inbox for support messages.",
  },
  {
    key: "PLAYWRIGHT_E2E_EMAIL",
    category: "Playwright/local smoke",
    requiredForProduction: false,
    description: "Local authenticated smoke-test account email.",
  },
  {
    key: "PLAYWRIGHT_E2E_PASSWORD",
    category: "Playwright/local smoke",
    requiredForProduction: false,
    description: "Local authenticated smoke-test account password.",
  },
  {
    key: "PLAYWRIGHT_BASE_URL",
    category: "Playwright/local smoke",
    requiredForProduction: false,
    description: "Base URL for local or deployed Playwright smoke tests.",
  },
  {
    key: "PLAYWRIGHT_DISABLE_SIGNUP_IP_LIMIT",
    category: "Playwright/local smoke",
    requiredForProduction: false,
    description: "Local smoke-test override for signup rate-limit scenarios.",
  },
];

// === Helpers ===

export function auditProductionEnvironment(env: Record<string, string | undefined>) {
  const missingRequired = ENV_REQUIREMENTS.filter(
    (requirement) =>
      requirement.requiredForProduction && !hasConfiguredValue(env, requirement.key),
  );
  const missingRecommended = ENV_REQUIREMENTS.filter(
    (requirement) =>
      requirement.recommendedForLaunch &&
      !hasConfiguredValue(env, requirement.key),
  );

  return {
    missingRequired,
    missingRecommended,
    requiredCount: ENV_REQUIREMENTS.filter((requirement) => requirement.requiredForProduction)
      .length,
    recommendedCount: ENV_REQUIREMENTS.filter(
      (requirement) => requirement.recommendedForLaunch,
    ).length,
  };
}

export function formatProductionEnvAudit(
  audit: ReturnType<typeof auditProductionEnvironment>,
) {
  const lines = [
    "Tagloom production environment audit",
    `Required: ${audit.requiredCount - audit.missingRequired.length}/${audit.requiredCount} configured`,
    `Recommended: ${audit.recommendedCount - audit.missingRecommended.length}/${audit.recommendedCount} configured`,
  ];

  if (audit.missingRequired.length > 0) {
    lines.push("", "Missing required production variables:");
    lines.push(...formatRequirements(audit.missingRequired));
  }

  if (audit.missingRecommended.length > 0) {
    lines.push("", "Missing recommended launch variables:");
    lines.push(...formatRequirements(audit.missingRecommended));
  }

  if (audit.missingRequired.length === 0) {
    lines.push("", "Production-required environment variables are configured.");
  }

  return lines.join("\n");
}

function hasConfiguredValue(env: Record<string, string | undefined>, key: string) {
  return Boolean(env[key]?.trim());
}

function formatRequirements(requirements: EnvRequirement[]) {
  return requirements.map(
    (requirement) =>
      `- ${requirement.key} (${requirement.category}): ${requirement.description}`,
  );
}
