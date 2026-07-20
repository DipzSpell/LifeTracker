-- LifeNotebook — Supabase Database Setup
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- 1. Create the user_states table
CREATE TABLE IF NOT EXISTS public.user_states (
  user_id   TEXT        PRIMARY KEY,
  state     JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_states ENABLE ROW LEVEL SECURITY;

-- 3. Policy: users can only read their own state
CREATE POLICY "Users can read own state"
  ON public.user_states
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- 4. Policy: users can insert their own state
CREATE POLICY "Users can insert own state"
  ON public.user_states
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- 5. Policy: users can update their own state
CREATE POLICY "Users can update own state"
  ON public.user_states
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 6. Policy: users can delete their own state
CREATE POLICY "Users can delete own state"
  ON public.user_states
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- 7. Auto-update updated_at on every change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_states
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
