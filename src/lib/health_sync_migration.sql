-- ═══════════════════════════════════════════════════════════════════
-- LifeNotebook — Health Sync migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Stores individual health readings synced from Google Fit or a
-- Bluetooth (Web Bluetooth GATT) device. One row per reading.
-- ═══════════════════════════════════════════════════════════════════

create table if not exists public.health_readings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  reading_type text not null check (reading_type in ('steps', 'heart_rate', 'sleep', 'calories')),
  value        numeric not null,
  unit         text not null,
  reading_date date not null,
  reading_time timestamptz not null default now(),
  source       text not null check (source in ('google_fit', 'bluetooth', 'manual')),
  created_at   timestamptz default now()
);

-- Fast per-user, per-day, per-type lookups (dashboard tiles, sync history)
create index if not exists health_readings_user_date_type_idx
  on public.health_readings (user_id, reading_date, reading_type);

alter table public.health_readings enable row level security;

-- Single all-operations policy: user can only touch their own rows
create policy "health_readings: all own"
  on public.health_readings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);