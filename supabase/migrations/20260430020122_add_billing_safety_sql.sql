-- Billing and usage safety for launch:
-- - Stripe webhook event idempotency ledger
-- - Atomic generation entitlement reservation/refund RPCs
-- - Profiles billing/usage columns are server-owned

drop policy if exists "profiles_update_own" on public.profiles;

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

revoke execute on function public.consume_generation_entitlement(uuid) from anon;
revoke execute on function public.refund_generation_entitlement(uuid, text) from anon;
grant execute on function public.consume_generation_entitlement(uuid) to authenticated;
grant execute on function public.refund_generation_entitlement(uuid, text) to authenticated;
