# Tagloom Deploy Readiness Checklist

## 1) Dev Data Reset Checklist (safe, dev-only)
- Confirm target project is local/dev before any reset.
- Use local Supabase reset tooling only against local containers.
- Re-run auth + generator + billing smoke checks after reset.
- Never run destructive reset commands against production.

## 2) Production Data and Migration Plan
- Take a full production database backup/snapshot first.
- Apply migrations in timestamp order from `supabase/migrations`.
- Validate critical tables/columns used by:
  - generation history
  - billing projection/subscription fields
  - webhook idempotency
  - feedback + error logs
- Run post-migration validation queries for row counts and non-null constraints.
- Rollback plan:
  - restore DB snapshot
  - revert deployment
  - re-verify webhook ingestion + billing status sync

## 3) Production Env Var Audit (no values)
Run the executable audit before a production deploy:

```sh
npm run check:env
```

The audit fails when production-required variables are missing and reports
recommended launch values separately. It does not print secret values.

- Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- OpenAI:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
- Stripe:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_SINGLE_USE_PRICE_ID`
  - `STRIPE_MONTHLY_PRICE_ID`
  - `STRIPE_YEARLY_PRICE_ID`
  - `STRIPE_SUCCESS_URL`
  - `STRIPE_CANCEL_URL`
  - `STRIPE_BILLING_RETURN_URL`
  - `STRIPE_STARTER_UPGRADE_COUPON_ID`
- Rate limit / bot checks:
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `TURNSTILE_SECRET_KEY`
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- Site + analytics:
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- Email/support:
  - `RESEND_API_KEY`
  - `SUPPORT_FROM_EMAIL`
  - `SUPPORT_TO_EMAIL`
- Playwright/local smoke:
  - `PLAYWRIGHT_E2E_EMAIL`
  - `PLAYWRIGHT_E2E_PASSWORD`
  - `PLAYWRIGHT_BASE_URL`
  - `PLAYWRIGHT_DISABLE_SIGNUP_IP_LIMIT`

## 4) SEO and Social Metadata Checklist
- Confirm `src/app/layout.tsx` metadata title/description match current positioning.
- Confirm OpenGraph fields are set:
  - title
  - description
  - url
  - siteName
  - type
- Confirm Twitter fields are set:
  - card
  - title
  - description
- Confirm `metadataBase` resolves correctly from `NEXT_PUBLIC_SITE_URL`.
- Verify `src/app/robots.ts` and `src/app/sitemap.ts` are deployed and reachable.

## 5) Support/Contact Email Smoke Checklist
- Route: `POST /api/support/contact`.
- Validate required fields and anti-spam checks.
- Verify provider credentials (`RESEND_API_KEY`) are set in target env.
- Run a controlled non-production smoke where allowed.
- Avoid unsolicited real sends from automated CI unless explicitly configured.

## 6) Admin Access Verification
- Admin helper: `src/lib/admin.ts`.
- Allowlist is strict: only `ace.lowder@gmail.com`.
- Non-admin authenticated users are redirected to `/`.
- Unauthenticated users are redirected to `/login?next=/admin`.

## 7) Stripe Webhook Verification (Production)
- Endpoint: `/api/stripe/webhook`.
- Ensure Stripe dashboard endpoint secret matches `STRIPE_WEBHOOK_SECRET`.
- Confirm these events are enabled:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.resumed`
  - `customer.subscription.paused`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Confirm successful idempotent processing and no repeated failed deliveries.

## 8) Final Manual Regression Checklist
- Homepage funnel copy and section order.
- Nav order: Home, About, Features, Pricing, Blog, Support, FAQ.
- Generator guest/paywall/unlock flow.
- Pricing actions:
  - guest prompts auth
  - logged-in checkout/switch/manage behavior
- Billing clarity:
  - free account view
  - paid renewal/portal state
- Blog intro, support intro, FAQ order.
- Contact/support flow.
- Stripe checkout return lands on `/billing`.
- Webhook events flowing after a test checkout/subscription change.
