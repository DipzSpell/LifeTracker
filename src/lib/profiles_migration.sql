-- ═══════════════════════════════════════════════════════════════════════════
-- LifeNotebook — profiles Migration
-- Adds custom userid/username support so users can sign in with their
-- email, username, or mobile number (all resolve to the real Supabase Auth
-- email under the hood — mobile number is NOT SMS-verified, it's just a
-- stored lookup key).
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run — uses IF NOT EXISTS and DROP IF EXISTS guards throughout.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0: Shared trigger function (also used by notebooks/journal_entries).
--         Create it here in case you're running this file alone.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Create profiles table
--
-- Column notes:
--   username — the user-chosen public handle. 3-20 chars, letters/digits/./_.
--              Case-insensitive uniqueness is enforced below via a
--              functional index (so "DipZ" and "dipz" collide).
--   phone    — optional, stored as typed. Unique when present (partial
--              index below), used only as a login lookup key — never
--              SMS-verified by Supabase.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  user_id    uuid        primary key references auth.users on delete cascade,
  username   text        not null,
  name       text        not null default '',
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_.]{3,20}$')
);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Uniqueness indexes
-- ─────────────────────────────────────────────────────────────────────────────
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

create unique index if not exists profiles_phone_idx
  on public.profiles (phone) where phone is not null;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Row-Level Security
--   Users can only ever read/insert/update their own profile row.
--   (No delete policy — rows are cleaned up via `on delete cascade` from
--   auth.users, not by end users directly.)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "profiles: select own" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles: update own"
  on public.profiles for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Auto-update updated_at on every row mutation
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists profiles_set_updated_at on public.profiles;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: is_username_available(check_username)
--   Callable by anon (live-checked while typing on the signup form, before
--   there's a session yet). Read-only, only ever returns a boolean.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_username_available(check_username text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select check_username ~ '^[a-zA-Z0-9_.]{3,20}$'
     and not exists (
       select 1 from public.profiles
       where lower(username) = lower(check_username)
     );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: resolve_login_email(identifier)
--   Given an email, username, or phone number typed into the login form,
--   returns the real Supabase Auth email to sign in with (or null).
--   SECURITY DEFINER so `anon` can read auth.users.email pre-login without
--   the client ever being granted direct access to the auth schema.
--   Only ever returns a single email string — no other row data leaks.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.resolve_login_email(identifier text)
returns text
language plpgsql
security definer
set search_path = auth, public, pg_temp
stable
as $$
declare
  found_email text;
begin
  -- 1. Direct email match (auth.users is the source of truth for email)
  select email into found_email
  from auth.users
  where lower(email) = lower(identifier)
  limit 1;

  if found_email is not null then
    return found_email;
  end if;

  -- 2. Username or phone match via profiles, joined back to auth.users
  select u.email into found_email
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where lower(p.username) = lower(identifier)
     or p.phone = identifier
  limit 1;

  return found_email; -- null if nothing matched
end;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: handle_new_user() trigger
--   Auto-creates the profiles row the moment a new auth.users row is
--   inserted, reading username/display_name/phone out of the metadata
--   passed via signUp({ options: { data: {...} } }). Runs as a DB trigger
--   (not a client-side insert after signUp) so it works regardless of
--   whether "Confirm email" is enabled — the client may not have an
--   active session yet at that point, but this trigger always fires.
--
--   Only inserts when `username` metadata is present, so OAuth sign-ins
--   (Google/GitHub, which never send a username) don't get a placeholder
--   row — those users are prompted to choose one via the ChooseUsername
--   gate on their first login instead.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.raw_user_meta_data ? 'username' then
    insert into public.profiles (user_id, username, name, phone)
    values (
      new.id,
      new.raw_user_meta_data ->> 'username',
      coalesce(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'phone', '')
    )
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- DONE ✓
-- Verify with: select * from public.profiles limit 1;
--              select public.is_username_available('someone');
-- ─────────────────────────────────────────────────────────────────────────────
