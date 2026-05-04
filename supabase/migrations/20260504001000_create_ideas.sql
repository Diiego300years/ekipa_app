-- Ideas persistence for the MVP.
-- Run this in the Supabase SQL Editor if migrations are not applied automatically.

create extension if not exists pgcrypto;

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  price numeric(10, 2),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ideas_title_not_blank check (length(trim(title)) > 0),
  constraint ideas_title_max_length check (char_length(title) <= 120),
  constraint ideas_description_max_length check (
    description is null or char_length(description) <= 1000
  ),
  constraint ideas_location_max_length check (
    location is null or char_length(location) <= 160
  ),
  constraint ideas_price_non_negative check (price is null or price >= 0)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ideas_title_not_blank'
      and conrelid = 'public.ideas'::regclass
  ) then
    alter table public.ideas
      add constraint ideas_title_not_blank
      check (length(trim(title)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ideas_title_max_length'
      and conrelid = 'public.ideas'::regclass
  ) then
    alter table public.ideas
      add constraint ideas_title_max_length
      check (char_length(title) <= 120);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ideas_description_max_length'
      and conrelid = 'public.ideas'::regclass
  ) then
    alter table public.ideas
      add constraint ideas_description_max_length
      check (description is null or char_length(description) <= 1000);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ideas_location_max_length'
      and conrelid = 'public.ideas'::regclass
  ) then
    alter table public.ideas
      add constraint ideas_location_max_length
      check (location is null or char_length(location) <= 160);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ideas_price_non_negative'
      and conrelid = 'public.ideas'::regclass
  ) then
    alter table public.ideas
      add constraint ideas_price_non_negative
      check (price is null or price >= 0);
  end if;
end $$;

create index if not exists ideas_created_at_idx
on public.ideas (created_at desc);

create index if not exists ideas_created_by_idx
on public.ideas (created_by);

alter table public.ideas enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.ideas to anon, authenticated;
grant insert, update, delete on public.ideas to authenticated;

drop policy if exists "Everyone can read ideas" on public.ideas;
create policy "Everyone can read ideas"
on public.ideas
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can create their own ideas" on public.ideas;
create policy "Authenticated users can create their own ideas"
on public.ideas
for insert
to authenticated
with check ((select auth.uid()) = created_by);

drop policy if exists "Authors can update their own ideas" on public.ideas;
create policy "Authors can update their own ideas"
on public.ideas
for update
to authenticated
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

drop policy if exists "Authors can delete their own ideas" on public.ideas;
create policy "Authors can delete their own ideas"
on public.ideas
for delete
to authenticated
using ((select auth.uid()) = created_by);

create or replace function public.set_idea_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ideas_updated_at on public.ideas;
create trigger set_ideas_updated_at
before update on public.ideas
for each row
execute function public.set_idea_updated_at();
