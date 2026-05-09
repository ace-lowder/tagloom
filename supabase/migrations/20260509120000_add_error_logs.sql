create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  source text not null,
  route text,
  method text,
  status integer,
  code text,
  message text not null,
  stack text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.error_logs enable row level security;

revoke all on public.error_logs from anon, authenticated;

create index if not exists error_logs_created_at_idx
  on public.error_logs (created_at desc);

create index if not exists error_logs_source_created_at_idx
  on public.error_logs (source, created_at desc);

create index if not exists error_logs_user_created_at_idx
  on public.error_logs (user_id, created_at desc);
