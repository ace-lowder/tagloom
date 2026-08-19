# UpdateTags

UpdateTags is a Next.js app that generates 13 Etsy-ready tags with saved history, paid plans, and quality safeguards.

## Run locally

You need Git, Node.js 22, npm, and test accounts for Supabase, OpenAI, Stripe, Upstash, Cloudflare Turnstile, and Resend.

```bash
git clone https://github.com/ace-lowder/updatetags.git
cd updatetags
nvm install
nvm use
npm ci
cp .env.example .env.local
```

Fill in `.env.local` as you configure each service below. Keep every credential in test or development mode.

### Supabase

1. Create a hosted Supabase project.
2. Run `scripts/setup-supabase.sql` in its SQL Editor.
3. Add the project URL, anon key, and service-role key to `.env.local`.
4. Set the Auth Site URL to `http://localhost:3000`.
5. Allow `http://localhost:3000/auth/callback` and `http://127.0.0.1:3000/auth/callback` as redirects.
6. Disable email confirmation for immediate local sign-in.

For optional Google sign-in, use the provider callback URL shown by Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`.

### App services

- OpenAI: add an API key and keep `OPENAI_MODEL=gpt-4o-mini`
- Upstash: add the Redis REST URL and token used for rate limits
- Turnstile: add matching local-development site and secret keys
- Resend: add an API key, verified sender, and destination support inbox

### Stripe

Create these active test prices and copy their IDs into `.env.local`:

- `UpdateTags Single`: $7 one-time
- `UpdateTags Monthly`: $19 monthly
- `UpdateTags Yearly`: $149 yearly

Enable the customer portal, then run the Stripe webhook listener in a second terminal:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

## Start the app

Check the configuration, then start Next.js:

```bash
npm run check:env
npm run check:stripe
npm run dev
```

Open `http://localhost:3000`. Sign up, generate tags, complete a test checkout, open the billing portal, and send a support message to verify the main flow.

## Commands

- `npm run validate` runs environment, Stripe, lint, type, test, and build checks
- `npm run e2e` runs the Playwright smoke tests
- `npm run benchmark` runs the paid generation benchmark

Admin tools currently allow only `ace.lowder@gmail.com`; change `ADMIN_EMAIL` in `src/lib/admin.ts` to test them with another account.
