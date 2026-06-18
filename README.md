# Tagloom

Generate 13 Etsy-ready tags from a listing in under 60 seconds. Tagloom is a Next.js and TypeScript app with Supabase auth/data, Stripe billing, OpenAI generation, and lightweight admin/support tooling.

## Clean-Machine Setup

1. Install Node 22, Git, npm, and the accounts you will use for Supabase, OpenAI, Stripe, Upstash, Resend, and Turnstile.
2. Clone the repo and install dependencies with `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Create a Supabase project, open the SQL Editor, and run `scripts/setup-supabase.sql`.
5. Copy the Supabase project URL, anon key, and service role key into `.env.local`.
6. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and allow these auth callbacks in Supabase:
   - `http://localhost:3000/auth/callback`
   - `http://127.0.0.1:3000/auth/callback`
7. Disable email confirmation in Supabase so local sign-in matches the app.
8. Optionally enable Google auth and add the same callback URLs to the OAuth client.
9. Create `OPENAI_API_KEY` and keep `OPENAI_MODEL=gpt-4o-mini`.
10. In Stripe test mode, create these active prices on the matching products:
    - `Tagloom Single`: `USD 7.00`, one-time
    - `Tagloom Monthly`: `USD 19.00`, recurring monthly
    - `Tagloom Yearly`: `USD 149.00`, recurring yearly
11. Enable the Stripe billing portal.
12. Run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET`. Listen for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.resumed`, `customer.subscription.paused`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`.
13. Configure Upstash, Turnstile, Resend sender/recipient, and optional GA and Playwright values.
14. Run `npm run check:env`, `npm run check:stripe`, and `npm run validate`.
15. Start Tagloom with `npm run dev`.

## Notes

- Local admin email: `ace.lowder@gmail.com`
- Optional end-to-end smoke: `npm run e2e`
- Paid generation benchmark: `npm run benchmark`
