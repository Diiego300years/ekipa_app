-- Idea comments persistence for the MVP.
-- Run this in the Supabase SQL Editor if migrations are not applied automatically.
-- Comments are loaded together with the /ideas list for this phase.
-- Do not add service-role access, lazy-loading RPCs, or comment notification logic here.

create extension if not exists pgcrypto;

create table if not exists public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint idea_comments_body_not_blank check (length(trim(body)) > 0),
  constraint idea_comments_body_max_length check (char_length(body) <= 1000)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'idea_comments_body_not_blank'
      and conrelid = 'public.idea_comments'::regclass
  ) then
    alter table public.idea_comments
      add constraint idea_comments_body_not_blank
      check (length(trim(body)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'idea_comments_body_max_length'
      and conrelid = 'public.idea_comments'::regclass
  ) then
    alter table public.idea_comments
      add constraint idea_comments_body_max_length
      check (char_length(body) <= 1000);
  end if;
end $$;

create index if not exists idea_comments_idea_id_created_at_idx
on public.idea_comments (idea_id, created_at asc);

create index if not exists idea_comments_user_id_idx
on public.idea_comments (user_id);

alter table public.idea_comments enable row level security;

grant usage on schema public to anon, authenticated;

revoke all on public.idea_comments from anon, authenticated;
grant select on public.idea_comments to anon, authenticated;
grant insert, update, delete on public.idea_comments to authenticated;

drop policy if exists "Everyone can read idea comments" on public.idea_comments;
create policy "Everyone can read idea comments"
on public.idea_comments
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated users can create their own idea comments" on public.idea_comments;
create policy "Authenticated users can create their own idea comments"
on public.idea_comments
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Authors can update their own idea comments" on public.idea_comments;
create policy "Authors can update their own idea comments"
on public.idea_comments
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Authors can delete their own idea comments" on public.idea_comments;
create policy "Authors can delete their own idea comments"
on public.idea_comments
for delete
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.set_idea_comment_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_idea_comments_updated_at on public.idea_comments;
create trigger set_idea_comments_updated_at
before update on public.idea_comments
for each row
execute function public.set_idea_comment_updated_at();
