# Tagloom Refactor Prep #52

## Goal

Prepare a safe refactor branch for Tagloom cleanup work.

This branch should preserve behavior while improving clarity, consistency, and maintainability. Refactors should be small, test-backed where meaningful, and scoped to one file cluster at a time.

## Current rules

- Do not change generation behavior unless explicitly scoped.
- Do not call OpenAI during refactors.
- Do not run `npm run benchmark` unless explicitly asked.
- Avoid broad rewrites.
- Avoid fallback fields, compatibility paths, loose catches, and alternate data shapes unless explicitly requested.
- Prefer clear failure over hidden uncertainty.
- Keep main public functions/components/endpoints near the top.
- Put helpers and types below under section headers like `// === Helpers ===`, `// === Types ===`, `// === Constants ===`.
- Frontend page files should show layout near the top with simple section components.
- API routes should read like pseudocode: get user/params, validate input, enforce rules, run DB action, return response.
- Use existing styles/components instead of unique one-off styles.
- Add or change tests only when they verify meaningful behavior or a specific regression.

## Observed current state

- `src/app/layout.tsx` sets site metadata from `NEXT_PUBLIC_SITE_URL` and uses `Outfit` plus `Inter` as the page fonts.
- `src/components/site/SiteNav.tsx` is already split across `SiteNavLinks`, `SiteNavParts`, and `SiteNavProfile`, with section anchors for `home`, `about`, `pricing`, and `faq`.
- `src/components/site/HomePageClient.tsx` renders the hero, about, pricing, FAQ, bottom CTA, and footer in one client component with inline section helpers.
- `src/content/home.ts` owns the about copy and FAQ answer parts, including `text`, `link`, and `break` entries.
- `src/components/generator/Generator.tsx` is the main orchestrator for title/description state, demo playback, history, usage, feedback, paywall recovery, and turnstile handling.
- `src/components/generator/useGeneratorDemo.ts` is timer-heavy and manages demo typing, reveal, clearing, pause/resume, visibility changes, intersection behavior, and scroll correction.
- `src/components/generator/useGeneratorGeneration.ts` handles request setup, generation execution, paywall state, modal copy, pending context persistence, and turnstile token lookup.
- `src/components/generator/useGenerationAccess.ts` is the login/pricing/unlock recovery path and touches URL-based resume behavior after auth or checkout.
- `src/lib/generation.ts` remains the largest generation file and mixes token cleanup, prompt construction, fallback generation, OpenAI calls, and public tag-generation exports.
- `src/app/api/generate/route.ts` is business-critical and handles protection, auth, billing refresh, entitlement reservation/refund, generation persistence, and paywall responses.
- `src/app/api/support/contact/route.ts` validates the support payload, persists support messages, and sends mail through Resend.
- `src/components/pricing/usePricingActions.ts` decides between checkout, billing portal, and plan-switch routes.

## Highest-value refactor targets

### 1. Generator orchestration

Files:
- `src/components/generator/Generator.tsx`
- `src/components/generator/useGeneratorGeneration.ts`
- `src/components/generator/useGenerationAccess.ts`
- `src/components/generator/useGeneratorHistory.ts`
- `src/components/generator/useGeneratedTags.ts`

Why:
The generator is the core product surface and currently has too much coordination logic spread across a large component and several wide hooks.

First safe slice:
Extract clearer controller shapes and handler groups without changing UI behavior. Start with `useGeneratorGeneration.ts`, because it has obvious internal seams:
- request preparation
- Turnstile token lookup
- generation state reset
- modal message/action derivation

Keep the public hook return shape stable unless tests are updated.

Likely validation:
`npm run test -- src/components/generator/Generator.generation.test.tsx src/components/generator/Generator.paywall.test.tsx`

### 2. Demo animation flow

Files:
- `src/components/generator/useGeneratorDemo.ts`
- `src/components/generator/usePausableTimer.ts`
- `src/components/generator/Generator.demo.test.tsx`

Why:
The demo hook is timer-heavy and hard to reason about. It is also visually sensitive, so it should be refactored cautiously.

First safe slice:
Extract local named helpers inside the same file before moving files:
- demo reset visual state
- demo typing loop
- demo reveal/clear scheduling
- pause/resume guards

Do not change timings, animation classes, fixture data, or CTA behavior.

Likely validation:
`npm run test -- src/components/generator/Generator.demo.test.tsx`

### 3. Generation engine organization

Files:
- `src/lib/generation.ts`
- `src/lib/generation.test.ts`

Why:
This file is too large and mixes constants, token cleanup, prompt text, parsing, fallback generation, and OpenAI orchestration. It is high leverage but high risk because tag quality depends on it.

First safe slice:
Do not change algorithms first. Begin with mechanical extraction only:
- constants/token sets to `src/lib/generationConstants.ts`
- prompt construction to `src/lib/generationPrompts.ts`
- keep exported public API from `generation.ts` unchanged: `generateTags`, `getPlaceholderTags`, `GENERATION_LOGIC_VERSION`, `MAX_GENERATION_DESCRIPTION_LENGTH`

Likely validation:
`npm run test -- src/lib/generation.test.ts`

### 4. Generate API route clarity

Files:
- `src/app/api/generate/route.ts`
- `src/app/api/generate/route.test.ts`
- `src/lib/stripeBillingSync.ts`
- `src/lib/apiProtection.ts`
- `src/lib/errorLogging.ts`

Why:
The route is business-critical and currently reads as one long flow with repeated profile refresh assignment and manual request parsing.

First safe slice:
Add small local helpers inside the route file before extracting shared files:
- `parseGenerateRequest`
- `loadProfile`
- `refreshProfileBillingProjection`
- `reserveGenerationEntitlement`
- `refundGenerationEntitlement`

Do not change response shapes, entitlement behavior, logging metadata, or paywall copy.

Likely validation:
`npm run test -- src/app/api/generate/route.test.ts`

### 5. Homepage component readability

Files:
- `src/components/site/HomePageClient.tsx`
- `src/content/home.ts`
- `src/components/site/HomePageClient.test.ts`

Why:
Homepage is not huge, but it has several inline sections and repeated motion patterns. It is lower risk than billing/generation logic.

First safe slice:
Only clean structure and repeated render helpers:
- keep exported `heroCopy` stable
- keep FAQ accordion behavior closed-by-default and one-open-at-a-time
- keep FAQ answer part rendering behavior, including `text`, `link`, and `break`
- do not change copy unless explicitly asked

Likely validation:
`npm run test -- src/components/site/HomePageClient.test.ts`

### 6. Support contact route validation

Files:
- `src/app/api/support/contact/route.ts`
- `src/app/api/support/contact/route.test.ts`

Why:
The route has manual validation and sanitization. It can become clearer with a request schema close to the endpoint.

First safe slice:
Introduce local Zod validation/coercion for the request body while keeping existing response messages and status codes.

Likely validation:
`npm run test -- src/app/api/support/contact/route.test.ts`

### 7. Navigation cleanup

Files:
- `src/components/site/SiteNav.tsx`
- `src/components/site/SiteNavLinks.tsx`
- `src/components/site/SiteNavParts.tsx`
- `src/components/site/SiteNavProfile.tsx`
- `src/components/site/siteNavConfig.ts`

Why:
Navigation is already partially split but can be clearer if state/scroll/auth concerns are separated from rendering.

First safe slice:
Do not restyle. Only extract repeated state/handler logic if it reduces the main component and keeps existing tests or behavior intact.

Likely validation:
Use existing relevant component tests if present. If no meaningful tests exist, do not add low-value implementation tests.

## Avoid touching at first

- Stripe checkout/session behavior.
- Stripe webhook behavior.
- Supabase migrations.
- Entitlement RPC names and response assumptions.
- Generation prompt wording or token filtering behavior.
- Benchmark scripts.
- Auth flow behavior.
- Public copy changes unless explicitly requested.
- Build config until the build-readiness slice.

## Suggested refactor sequence

1. Branch/docs prep only.
2. `useGeneratorGeneration.ts` internal helper cleanup.
3. `Generator.tsx` handler/controller grouping.
4. `useGeneratorDemo.ts` local helper cleanup.
5. `src/lib/generation.ts` mechanical file split.
6. `src/app/api/generate/route.ts` local helper cleanup.
7. Homepage structural cleanup.
8. Build-readiness investigation.

## First implementation prompt after this prep

Start with `useGeneratorGeneration.ts`.

Do not change behavior. Extract helpers in the same file first. Keep public hook params and returned fields stable. Run only:

```bash
npm run test -- src/components/generator/Generator.generation.test.tsx src/components/generator/Generator.paywall.test.tsx
```

## Notes from #52 context read

- `src/lib/generation.ts` exports `generateTags`, `getPlaceholderTags`, `GENERATION_LOGIC_VERSION`, and `MAX_GENERATION_DESCRIPTION_LENGTH`.
- `src/components/site/HomePageClient.tsx` uses `dispatchGeneratorCta`/`consumePendingGeneratorCta` and renders the generator below the hero before the rest of the funnel.
- `src/components/site/SiteNavLinks.tsx` and `src/components/site/SiteNavParts.tsx` already split navigation rendering from nav state and account actions.
- `src/components/generator/GeneratorDialogs.tsx`, `GeneratorShell.tsx`, `generatorTags.ts`, and `useGeneratedTags.ts` are already separate support pieces around the generator flow.
- `src/lib/stripeBillingSync.ts` still contains `any`-typed Supabase admin usage in its internal helpers.
- `src/lib/apiProtection.ts` centralizes Turnstile verification and Upstash rate limiting.
- `src/lib/errorLogging.ts` redacts sensitive metadata keys before persistence.
- `src/app/api/support/contact/route.ts` returns `{ ok: true }` on success and `{ ok: false, error: ... }` on validation or persistence failures.

Prompt ID: #52
