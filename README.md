# Tagloom

Generate 13 Etsy-ready tags from a listing in under 60 seconds. Tagloom is a Next.js and TypeScript app with Supabase auth and data, Stripe billing, OpenAI generation, and support/admin tooling.

## Local Setup

1. Install Git and Node 22.
2. If you use `nvm`, the repo's `.nvmrc` pins Node 22. Install and select it:

   ```bash
   nvm install
   nvm use
   node -v
   ```

   Expected outcome: `node -v` prints a `v22.x.x` version.

3. Clone the repository and enter it:

   ```bash
   git clone https://github.com/ace-lowder/tagloom.git
   cd tagloom
   ```

4. Install dependencies:

   ```bash
   npm ci
   ```

   Expected outcome: npm finishes without changing the lockfile.

5. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

6. Create a hosted Supabase project in the Supabase dashboard.
7. In the Supabase dashboard SQL Editor, run the complete `scripts/setup-supabase.sql`.
8. Copy these Supabase values into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
9. In the Supabase dashboard, open Authentication -> URL Configuration and set the Site URL to `http://localhost:3000`.
10. In the same Supabase URL Configuration screen, add these allowed redirects:
    - `http://localhost:3000/auth/callback`
    - `http://127.0.0.1:3000/auth/callback`
11. Disable email confirmation in Supabase Auth so local sign-in works immediately.
12. If you enable Google sign-in, open Authentication -> Providers -> Google and use the provider callback URL shown by Supabase:

    ```text
    https://<project-ref>.supabase.co/auth/v1/callback
    ```

    This is separate from the app callback URLs in step 10.
13. In the OpenAI dashboard, create an API key and set:
    - `OPENAI_API_KEY`
    - `OPENAI_MODEL=gpt-4o-mini`
14. In the Upstash console, create a Redis database and copy its REST URL and token into:
    - `UPSTASH_REDIS_REST_URL`
    - `UPSTASH_REDIS_REST_TOKEN`
15. In the Cloudflare dashboard, create a Turnstile widget for local development and copy:
    - `TURNSTILE_SECRET_KEY`
    - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

    Local testing needs matching site and secret keys from the same widget.
16. In the Resend dashboard, create an API key and set:
    - `RESEND_API_KEY`
    - `SUPPORT_FROM_EMAIL`
    - `SUPPORT_TO_EMAIL`

    `SUPPORT_FROM_EMAIL` must be a verified sender. `SUPPORT_TO_EMAIL` is where support messages are delivered.
17. In the Stripe dashboard, create these active test prices:
    - Starter: `$7` one-time, product `Tagloom Single`
    - Monthly: `$19/month`, product `Tagloom Monthly`
    - Yearly: `$149/year`, product `Tagloom Yearly`
18. Copy the Stripe IDs into `.env.local`:
    - `STRIPE_SECRET_KEY`
    - `STRIPE_WEBHOOK_SECRET`
    - `STRIPE_SINGLE_USE_PRICE_ID`
    - `STRIPE_MONTHLY_PRICE_ID`
    - `STRIPE_YEARLY_PRICE_ID`
19. In the Stripe dashboard, enable the customer portal.
20. Install or log in to the Stripe CLI, then forward webhooks to Tagloom:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Copy the displayed signing secret into `STRIPE_WEBHOOK_SECRET`.
21. The webhook handler listens for these Stripe events:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.resumed`
    - `customer.subscription.paused`
    - `customer.subscription.deleted`
    - `invoice.paid`
    - `invoice.payment_failed`
22. Optional: set Google Analytics, Playwright smoke-test credentials, and any other non-required values in `.env.local`.
23. Run the checks:

   ```bash
   npm run check:env
   npm run check:stripe
   ```

   Expected outcome: both commands finish cleanly.
24. Start the app:

   ```bash
   npm run dev
   ```

   Expected outcome: Tagloom opens at `http://localhost:3000`.

## Functional Check

1. Sign up with a fresh account and confirm the callback returns you to the app.
2. Generate tags from a listing and confirm the generation succeeds.
3. Complete a Stripe checkout and confirm the webhook updates your account.
4. Open the billing portal and confirm plan management loads.
5. Send a support message and confirm it reaches the support inbox.

## Notes

- Admin access is limited to `ace.lowder@gmail.com`.
- Optional end-to-end smoke: `npm run e2e`
- Optional paid benchmark: `npm run benchmark`
- Full repo validation: `npm run validate`
