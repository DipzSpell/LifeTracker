-- SQL script to set up user states and RLS policies in Supabase SQL editor

-- Table to store user app states
create table if not exists public.user_states (
  user_id uuid references auth.users not null primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_states enable row level security;

-- Policies for CRUD access
create policy "Users can read their own state"
  on public.user_states for select
  using (auth.uid() = user_id);

create policy "Users can insert their own state"
  on public.user_states for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own state"
  on public.user_states for update
  using (auth.uid() = user_id);

create policy "Users can delete their own state"
  on public.user_states for delete
  using (auth.uid() = user_id);
