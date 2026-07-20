-- ═══════════════════════════════════════════════════════════════════════════
-- LifeNotebook — journal_entries Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run — uses IF NOT EXISTS and DROP IF EXISTS guards throughout.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0: Shared trigger function (also used by notebooks).
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
-- STEP 1: Create journal_entries table
--
-- Column notes:
--   top_things     — text[] stores the 3 "top things today" strings
--                    (JSONB array of strings also works; text[] is simpler)
--   work_notes     — Work / Dev notes free-text
--   trading_notes  — Trading log free-text
--   gym_notes      — Gym & Training notes
--   mood_notes     — Mood & Mindset notes
--   tomorrow_focus — Tomorrow's focus / next-day objective
--   unique(user_id, entry_date) enforces one entry per user per calendar day
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.journal_entries (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        references auth.users not null,
  entry_date     date        not null default current_date,
  top_things     text[]      not null default '{}',
  work_notes     text        not null default '',
  trading_notes  text        not null default '',
  gym_notes      text        not null default '',
  mood_notes     text        not null default '',
  tomorrow_focus text        not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint journal_entries_user_date_unique unique (user_id, entry_date)
);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Performance index — fast lookups per user ordered by date desc
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists journal_entries_user_date_idx
  on public.journal_entries (user_id, entry_date desc);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Row-Level Security
--   Enable RLS then add four explicit policies so users can only ever
--   read, insert, update, or delete their own rows.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.journal_entries enable row level security;

-- Drop old versions first (safe no-op if they don't exist)
drop policy if exists "journal_entries: all own"     on public.journal_entries;
drop policy if exists "journal_entries: select own"  on public.journal_entries;
drop policy if exists "journal_entries: insert own"  on public.journal_entries;
drop policy if exists "journal_entries: update own"  on public.journal_entries;
drop policy if exists "journal_entries: delete own"  on public.journal_entries;

-- SELECT — user can only read their own entries
create policy "journal_entries: select own"
  on public.journal_entries for select
  using (auth.uid() = user_id);

-- INSERT — user can only insert rows with their own user_id
create policy "journal_entries: insert own"
  on public.journal_entries for insert
  with check (auth.uid() = user_id);

-- UPDATE — user can only update their own rows
create policy "journal_entries: update own"
  on public.journal_entries for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE — user can only delete their own rows
create policy "journal_entries: delete own"
  on public.journal_entries for delete
  using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Auto-update updated_at on every row mutation
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists journal_entries_set_updated_at on public.journal_entries;

create trigger journal_entries_set_updated_at
  before update on public.journal_entries
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- DONE ✓
-- Verify with: select * from public.journal_entries limit 1;
-- ─────────────────────────────────────────────────────────────────────────────
