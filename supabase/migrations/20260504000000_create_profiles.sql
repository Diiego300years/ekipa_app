-- Profiles for public display names.
-- Run this in the Supabase SQL Editor if migrations are not applied automatically.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_not_blank check (length(trim(display_name)) > 0)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_display_name_not_blank'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_display_name_not_blank
      check (length(trim(display_name)) > 0);
  end if;
end $$;

alter table public.profiles enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

drop policy if exists "Anyone can read profile display names" on public.profiles;
create policy "Anyone can read profile display names"
on public.profiles
for select
using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_display_name text;
begin
  clean_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'user-' || left(new.id::text, 8)
  );

  insert into public.profiles (id, display_name)
  values (new.id, clean_display_name)
  on conflict (id) do update
  set display_name = excluded.display_name,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists create_profile_after_auth_user_insert on auth.users;
create trigger create_profile_after_auth_user_insert
after insert on auth.users
for each row
execute function public.create_profile_for_new_user();

insert into public.profiles (id, display_name, created_at, updated_at)
select
  auth_users.id,
  coalesce(
    nullif(trim(auth_users.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(auth_users.email, '@', 1), ''),
    'user-' || left(auth_users.id::text, 8)
  ),
  coalesce(auth_users.created_at, now()),
  now()
from auth.users as auth_users
on conflict (id) do nothing;
