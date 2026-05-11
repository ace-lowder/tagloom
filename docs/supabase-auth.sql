-- Minimal Supabase auth bootstrap for Tagloom
-- Run this in your Supabase SQL editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles
  add column if not exists free_generation_credits int not null default 1,
  add column if not exists single_use_credits int not null default 0,
  add column if not exists starter_upgrade_discount_available boolean not null default false,
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_tier text,
  add column if not exists subscription_active boolean not null default false,
  add column if not exists subscription_period_start timestamptz,
  add column if not exists subscription_period_end timestamptz,
  add column if not exists subscription_cancel_at timestamptz,
  add column if not exists monthly_generation_count int not null default 0,
  add column if not exists monthly_count_period_start timestamptz;

-- Billing and usage fields on profiles are server-owned.
-- Authenticated clients may read their own profile and may only insert safe profile fields.
-- Direct client updates are disabled; service-role server code and security-definer
-- functions remain responsible for billing, Stripe, credit, and usage mutations.
revoke insert, update on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, email, full_name, avatar_url) on public.profiles to authenticated;

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  status text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  error text
);

alter table public.stripe_events enable row level security;

create or replace function public.consume_generation_entitlement(p_user_id uuid)
returns table (
  allowed boolean,
  entitlement_used text,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles%rowtype;
begin
  if auth.uid() is distinct from p_user_id then
    return query select false, null::text, 'profile_not_found';
    return;
  end if;

  select *
  into profile_row
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return query select false, null::text, 'profile_not_found';
    return;
  end if;

  if profile_row.free_generation_credits > 0 then
    update public.profiles
    set free_generation_credits = free_generation_credits - 1
    where id = p_user_id;

    return query select true, 'free_credit'::text, null::text;
    return;
  end if;

  if profile_row.single_use_credits > 0 then
    update public.profiles
    set single_use_credits = single_use_credits - 1
    where id = p_user_id;

    return query select true, 'single_use'::text, null::text;
    return;
  end if;

  if profile_row.subscription_active and profile_row.subscription_tier = 'yearly' then
    return query select true, 'subscription_yearly'::text, null::text;
    return;
  end if;

  if profile_row.subscription_active and profile_row.subscription_tier = 'monthly' then
    if profile_row.subscription_period_start is not null
      and profile_row.monthly_count_period_start is distinct from profile_row.subscription_period_start then
      profile_row.monthly_generation_count := 0;

      update public.profiles
      set
        monthly_generation_count = 0,
        monthly_count_period_start = profile_row.subscription_period_start
      where id = p_user_id;
    end if;

    if profile_row.monthly_generation_count < 100 then
      update public.profiles
      set
        monthly_generation_count = monthly_generation_count + 1,
        monthly_count_period_start = coalesce(monthly_count_period_start, subscription_period_start)
      where id = p_user_id;

      return query select true, 'subscription_monthly'::text, null::text;
      return;
    end if;

    return query select false, null::text, 'monthly_limit'::text;
    return;
  end if;

  return query select false, null::text, 'no_entitlement'::text;
end;
$$;

create or replace function public.refund_generation_entitlement(
  p_user_id uuid,
  p_entitlement_used text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_user_id then
    return;
  end if;

  perform 1
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return;
  end if;

  if p_entitlement_used = 'free_credit' then
    update public.profiles
    set free_generation_credits = free_generation_credits + 1
    where id = p_user_id;
  elsif p_entitlement_used = 'single_use' then
    update public.profiles
    set single_use_credits = single_use_credits + 1
    where id = p_user_id;
  elsif p_entitlement_used = 'subscription_monthly' then
    update public.profiles
    set monthly_generation_count = greatest(0, monthly_generation_count - 1)
    where id = p_user_id;
  end if;
end;
$$;

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  target_tags jsonb not null,
  discovery_tags jsonb not null,
  source text not null,
  entitlement_used text not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.generations
  add column if not exists archived_at timestamptz;

create index if not exists generations_user_archived_created_idx
  on public.generations (user_id, archived_at, created_at desc);

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

alter table public.generations enable row level security;

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own"
  on public.generations
  for select
  using (auth.uid() = user_id);

drop policy if exists "generations_insert_own" on public.generations;
create policy "generations_insert_own"
  on public.generations
  for insert
  with check (auth.uid() = user_id);
