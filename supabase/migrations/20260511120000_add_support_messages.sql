create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  resend_message_id text,
  error_message text,
  email_domain text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_messages enable row level security;

revoke all on public.support_messages from anon, authenticated;

create index if not exists support_messages_created_at_idx
  on public.support_messages (created_at desc);

create index if not exists support_messages_status_created_at_idx
  on public.support_messages (status, created_at desc);

create index if not exists support_messages_user_created_at_idx
  on public.support_messages (user_id, created_at desc);

create index if not exists support_messages_email_created_at_idx
  on public.support_messages (email, created_at desc);
