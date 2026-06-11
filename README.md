# Tagloom

Generate 13 Etsy-ready tags from a listing in under 60 seconds
`Next.js | TypeScript | Vercel`

## Installation

1. Clone the repository.
2. Install dependencies.

   ```sh
   npm install
   ```

3. Run locally.

   ```sh
   npm run dev
   ```

## Google Analytics 4

For basic site traffic/page view tracking, create or use a GA4 web stream for
`https://tagloom.app`.

Set this in local and deployment environments:

```sh
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-...
```

No Google CLI or Google auth setup is needed for this basic site tracking.

Local verification:

1. Run `npm run dev`.
2. Visit local pages and confirm events in GA Realtime/DebugView.
3. Test UTM capture with:
   `http://localhost:3000/?utm_source=youtube&utm_medium=paid&utm_campaign=local_test`

If you do not want local/dev traffic sent to GA, omit
`NEXT_PUBLIC_GA_MEASUREMENT_ID`.

## Admin Dashboard

`/admin` and all `/admin/*` routes are private.

- Only `ace.lowder@gmail.com` is allowed access.
- Unauthenticated users are redirected to `/login?next=/admin`.
- Authenticated non-admin users are redirected to `/`.
- Dashboard pages are read-only and use Supabase service-role reads on the server.
- Admin pages support a shared range switch: `All / 1d / 7d / 30d`.
- GA traffic reporting remains in Google Analytics for now.

## Database Migrations

Apply Supabase migrations before running features that read persisted data. The
generation history table view requires `public.generations.archived_at`.

If `/api/generations/history?limit=100&page=0` returns
`Generation history schema is out of date`, apply:

```sql
alter table public.generations
  add column if not exists archived_at timestamptz;

create index if not exists generations_user_archived_created_idx
  on public.generations (user_id, archived_at, created_at desc);
```

The same SQL is in
`supabase/migrations/20260508090000_add_generation_archive.sql`.

## Weekly Error Log Maintenance

Apply migration `supabase/migrations/20260509120000_add_error_logs.sql` to enable
server-side error logging to `public.error_logs`.

Example weekly query:

```sql
select created_at, source, route, status, code, message, metadata
from public.error_logs
where created_at >= now() - interval '7 days'
order by created_at desc;
```

## Weekly Feedback Maintenance

Apply migration `supabase/migrations/20260509130000_add_feedback_tables.sql` to
enable article and generation feedback capture.

Recent downvoted generation feedback:

```sql
select created_at, generation_id, user_id, note, title_snapshot
from public.generation_feedback
where rating = 'down'
order by created_at desc
limit 100;
```

Recent support article feedback:

```sql
select created_at, article_slug, rating, note, user_id
from public.support_article_feedback
order by created_at desc
limit 100;
```

Feedback counts by rating:

```sql
select 'generation' as source, rating, count(*) as total
from public.generation_feedback
group by rating
union all
select 'article' as source, rating, count(*) as total
from public.support_article_feedback
group by rating
order by source, rating;
```

## Manual Generation Benchmark

Tag generation has a manual paid benchmark that is not part of tests/build/CI.

See `benchmarks/README.md` for setup, when to run it, and how to compare results.

## Deploy Readiness

Launch checklist and production verification steps are in:

- `docs/deploy-readiness.md`

Before a production deploy, run:

```sh
npm run check:env
npm run test
npm run build
```
