alter table public.generations
  add column if not exists archived_at timestamptz;

create index if not exists generations_user_archived_created_idx
  on public.generations (user_id, archived_at, created_at desc);
