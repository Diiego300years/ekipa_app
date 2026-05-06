-- RSVP responses for scheduled calendar events.
-- Run this in the Supabase SQL Editor if migrations are not applied automatically.
-- Responses use the authenticated public client and RLS; do not add service-role access.

create extension if not exists pgcrypto;

create table if not exists public.calendar_event_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_event_responses_event_user_unique unique (event_id, user_id),
  constraint calendar_event_responses_status_check check (
    status in ('attending', 'declined')
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_event_responses_event_user_unique'
      and conrelid = 'public.calendar_event_responses'::regclass
  ) then
    alter table public.calendar_event_responses
      add constraint calendar_event_responses_event_user_unique
      unique (event_id, user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_event_responses_status_check'
      and conrelid = 'public.calendar_event_responses'::regclass
  ) then
    alter table public.calendar_event_responses
      add constraint calendar_event_responses_status_check
      check (status in ('attending', 'declined'));
  end if;
end $$;

create index if not exists calendar_event_responses_event_id_idx
on public.calendar_event_responses (event_id);

create index if not exists calendar_event_responses_user_id_idx
on public.calendar_event_responses (user_id);

alter table public.calendar_event_responses enable row level security;

grant usage on schema public to anon, authenticated;

revoke all on public.calendar_event_responses from anon, authenticated;
grant select on public.calendar_event_responses to anon, authenticated;
grant insert, update, delete on public.calendar_event_responses to authenticated;

drop policy if exists "Everyone can read calendar event responses" on public.calendar_event_responses;
create policy "Everyone can read calendar event responses"
on public.calendar_event_responses
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can create their own calendar event response" on public.calendar_event_responses;
create policy "Authenticated users can create their own calendar event response"
on public.calendar_event_responses
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can update their own calendar event response" on public.calendar_event_responses;
create policy "Authenticated users can update their own calendar event response"
on public.calendar_event_responses
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated users can delete their own calendar event response" on public.calendar_event_responses;
create policy "Authenticated users can delete their own calendar event response"
on public.calendar_event_responses
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_calendar_event_response_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_calendar_event_responses_updated_at
on public.calendar_event_responses;
create trigger set_calendar_event_responses_updated_at
before update on public.calendar_event_responses
for each row
execute function public.set_calendar_event_response_updated_at();
