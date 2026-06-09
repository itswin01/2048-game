-- Run this in your Supabase SQL editor

create table if not exists public.high_scores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  dimension   integer not null default 4,
  score       integer not null default 0,
  updated_at  timestamptz not null default now(),
  unique(user_id, dimension)
);

-- Row Level Security
alter table public.high_scores enable row level security;

create policy "Users can view own scores"
  on public.high_scores for select
  using (auth.uid() = user_id);

create policy "Users can insert own scores"
  on public.high_scores for insert
  with check (auth.uid() = user_id);

create policy "Users can update own scores"
  on public.high_scores for update
  using (auth.uid() = user_id);
