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
