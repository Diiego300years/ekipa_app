-- Web Push subscriptions for opt-in system notifications.
-- Run this in the Supabase SQL Editor if migrations are not applied automatically.
-- Subscriptions are device/browser-specific and are managed by authenticated users.

create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint),
  constraint push_subscriptions_endpoint_not_blank check (length(trim(endpoint)) > 0),
  constraint push_subscriptions_p256dh_not_blank check (length(trim(p256dh)) > 0),
  constraint push_subscriptions_auth_not_blank check (length(trim(auth)) > 0)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_subscriptions_endpoint_unique'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_endpoint_unique
      unique (endpoint);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_subscriptions_endpoint_not_blank'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_endpoint_not_blank
      check (length(trim(endpoint)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_subscriptions_p256dh_not_blank'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_p256dh_not_blank
      check (length(trim(p256dh)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'push_subscriptions_auth_not_blank'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_auth_not_blank
      check (length(trim(auth)) > 0);
  end if;
end $$;

create index if not exists push_subscriptions_user_id_idx
on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

grant usage on schema public to authenticated;

revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop policy if exists "Users can read their own push subscriptions" on public.push_subscriptions;
create policy "Users can read their own push subscriptions"
on public.push_subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own push subscriptions" on public.push_subscriptions;
create policy "Users can insert their own push subscriptions"
on public.push_subscriptions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own push subscriptions" on public.push_subscriptions;
create policy "Users can update their own push subscriptions"
on public.push_subscriptions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own push subscriptions" on public.push_subscriptions;
create policy "Users can delete their own push subscriptions"
on public.push_subscriptions
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_push_subscription_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row
execute function public.set_push_subscription_updated_at();
