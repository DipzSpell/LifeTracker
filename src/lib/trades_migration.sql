-- ═══════════════════════════════════════════════════════════════════════════
-- LifeTracker — trades (Trading Journal) Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run — all statements use IF NOT EXISTS / OR REPLACE guards.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 0: Shared trigger function (idempotent — OR REPLACE is safe)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Create trades table
--
-- Column notes:
--   symbol        — NSE ticker, e.g. NIFTY, BANKNIFTY, RELIANCE
--   segment       — 'Futures' | 'Options' | 'Equity'
--   option_type   — 'CE' | 'PE' | null (null for Futures / Equity)
--   strike_price  — Options strike; null otherwise
--   expiry_date   — Options/Futures expiry; null for Equity
--   trade_type    — 'Long' | 'Short'
--   entry_price   — Price at entry (required)
--   exit_price    — Price at exit; null = trade still open
--   lot_size      — Standard lot size for the instrument
--   quantity      — lots × lot_size (stored, not computed, for flexibility)
--   stop_loss     — Optional SL price
--   target        — Optional target price
--   pnl           — Stored P&L (computed and stored by the app on close)
--   pnl_percent   — Stored P&L% (computed and stored by the app on close)
--   status        — 'Open' | 'Closed' | 'Stopped Out'
--   strategy_tag  — e.g. 'Breakout', 'Reversal', 'Scalp', 'Swing'
--   entry_reason  — Why the trade was taken
--   exit_reason   — Why the trade was closed
--   lessons_learned — Post-trade review notes
--   screenshot_url  — URL to a chart screenshot (Supabase Storage or external)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.trades (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        references auth.users not null,

  trade_date       date        not null default current_date,
  symbol           text        not null,
  segment          text        not null default 'Options'
                               check (segment in ('Futures', 'Options', 'Equity')),
  option_type      text        check (option_type in ('CE', 'PE')),
  strike_price     numeric,
  expiry_date      date,

  trade_type       text        not null default 'Long'
                               check (trade_type in ('Long', 'Short')),
  entry_price      numeric     not null,
  exit_price       numeric,
  lot_size         integer     not null default 1,
  quantity         integer     not null default 1,
  stop_loss        numeric,
  target           numeric,

  -- P&L stored (calculated by app on close so edits are possible)
  pnl              numeric     default 0,
  pnl_percent      numeric     default 0,

  status           text        not null default 'Open'
                               check (status in ('Open', 'Closed', 'Stopped Out')),

  strategy_tag     text,
  entry_reason     text,
  exit_reason      text,
  lessons_learned  text,
  screenshot_url   text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Performance indexes
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists trades_user_date_idx
  on public.trades (user_id, trade_date desc);

create index if not exists trades_user_status_idx
  on public.trades (user_id, status);

create index if not exists trades_user_symbol_idx
  on public.trades (user_id, symbol);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Row-Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.trades enable row level security;

-- Drop existing policies (safe if they don't exist)
drop policy if exists "trades: select own"  on public.trades;
drop policy if exists "trades: insert own"  on public.trades;
drop policy if exists "trades: update own"  on public.trades;
drop policy if exists "trades: delete own"  on public.trades;

-- Users can only read their own trades
create policy "trades: select own"
  on public.trades for select
  using (auth.uid() = user_id);

-- Users can only insert rows with their own user_id
create policy "trades: insert own"
  on public.trades for insert
  with check (auth.uid() = user_id);

-- Users can only update their own rows
create policy "trades: update own"
  on public.trades for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only delete their own rows
create policy "trades: delete own"
  on public.trades for delete
  using (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Auto-update updated_at on every row mutation
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists trades_set_updated_at on public.trades;

create trigger trades_set_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();


-- ─────────────────────────────────────────────────────────────────────────────
-- DONE ✓
-- Verify with: select * from public.trades limit 1;
-- ─────────────────────────────────────────────────────────────────────────────
