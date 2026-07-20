-- ═══════════════════════════════════════════════════════════════════
-- LifeNotebook — Supabase SQL Setup
-- Run this entire script in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────
-- 1. user_states table
--    Stores the full app state JSON blob per user (habits, logs, etc.)
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.user_states (
  user_id    uuid references auth.users not null primary key,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz default timezone('utc', now()) not null
);

alter table public.user_states enable row level security;

-- Policies — each user can only access their own row
create policy "user_states: select own"
  on public.user_states for select
  using (auth.uid() = user_id);

create policy "user_states: insert own"
  on public.user_states for insert
  with check (auth.uid() = user_id);

create policy "user_states: update own"
  on public.user_states for update
  using (auth.uid() = user_id);

create policy "user_states: delete own"
  on public.user_states for delete
  using (auth.uid() = user_id);


-- ──────────────────────────────────────────────────────────────────
-- 2. notebooks table
--    Private notes / diary entries, one row per notebook entry.
--    The user_id column ensures complete data isolation via RLS.
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.notebooks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users not null,
  title      text not null,
  content    text default '',
  tags       text[] default '{}',
  pinned     boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast per-user queries
create index if not exists notebooks_user_id_idx
  on public.notebooks (user_id, created_at desc);

alter table public.notebooks enable row level security;

-- Single all-operations policy: user can only touch their own rows
create policy "notebooks: all own"
  on public.notebooks for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at on every row change
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notebooks_set_updated_at on public.notebooks;
create trigger notebooks_set_updated_at
  before update on public.notebooks
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────────────
-- 3. journal_entries table
--    Daily journal entries, one row per user per day.
--    Columns map exactly to App states: top things, work, trading, gym, mood, tomorrow focus.
-- ──────────────────────────────────────────────────────────────────
create table if not exists public.journal_entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users not null,
  entry_date     date not null,
  top_things     text[] default '{}',
  work_notes     text default '',
  trading_notes  text default '',
  gym_notes      text default '',
  mood_notes     text default '',
  tomorrow_focus text default '',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (user_id, entry_date)
);

-- Index for fast user searches by date
create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, entry_date desc);

alter table public.journal_entries enable row level security;

-- Single all-operations policy: user can only touch their own rows
create policy "journal_entries: all own"
  on public.journal_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at on every row change
drop trigger if exists journal_entries_set_updated_at on public.journal_entries;
create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();

