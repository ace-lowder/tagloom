create table if not exists public.support_article_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  article_slug text not null,
  rating text not null check (rating in ('up', 'down')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_article_feedback_user_article_unique unique (user_id, article_slug)
);

alter table public.support_article_feedback enable row level security;

revoke all on public.support_article_feedback from anon, authenticated;

create index if not exists support_article_feedback_created_at_idx
  on public.support_article_feedback (created_at desc);

create index if not exists support_article_feedback_rating_created_at_idx
  on public.support_article_feedback (rating, created_at desc);

create index if not exists support_article_feedback_article_created_at_idx
  on public.support_article_feedback (article_slug, created_at desc);

create table if not exists public.generation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_id uuid not null references public.generations(id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  note text,
  title_snapshot text not null default '',
  description_snapshot text not null default '',
  target_tags_snapshot jsonb not null default '[]'::jsonb,
  discovery_tags_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint generation_feedback_user_generation_unique unique (user_id, generation_id)
);

alter table public.generation_feedback enable row level security;

revoke all on public.generation_feedback from anon, authenticated;

create index if not exists generation_feedback_created_at_idx
  on public.generation_feedback (created_at desc);

create index if not exists generation_feedback_rating_created_at_idx
  on public.generation_feedback (rating, created_at desc);

create index if not exists generation_feedback_generation_created_at_idx
  on public.generation_feedback (generation_id, created_at desc);
