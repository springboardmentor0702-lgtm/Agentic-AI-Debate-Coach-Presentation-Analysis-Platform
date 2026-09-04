-- Segment 4: Counterargument Generation Engine
-- Run this once in your Supabase project's SQL Editor, in addition to
-- schema.sql, segment_2_schema.sql, and segment_3_schema.sql (which you
-- should already have run).

create table if not exists public.counterarguments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input_text text not null,
  topic text,
  counterarguments jsonb not null default '[]'::jsonb,
  challenge_questions jsonb not null default '[]'::jsonb,
  alternative_perspectives jsonb not null default '[]'::jsonb,
  strategy_suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.counterarguments enable row level security;

drop policy if exists "Users can view own counterarguments" on public.counterarguments;
create policy "Users can view own counterarguments"
  on public.counterarguments for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own counterarguments" on public.counterarguments;
create policy "Users can insert own counterarguments"
  on public.counterarguments for insert
  with check (auth.uid() = user_id);
