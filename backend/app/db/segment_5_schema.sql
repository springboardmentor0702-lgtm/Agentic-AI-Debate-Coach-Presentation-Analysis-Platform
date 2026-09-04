-- Segment 5: Agentic Orchestration Layer
-- Run this once in your Supabase project's SQL Editor, in addition to
-- schema.sql, segment_2_schema.sql, segment_3_schema.sql, and
-- segment_4_schema.sql (which you should already have run).

create table if not exists public.case_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input_text text not null,
  topic text,
  tools_run jsonb not null default '[]'::jsonb,
  argument_analysis jsonb,
  fallacy_detection jsonb,
  counterarguments jsonb,
  synthesis text,
  created_at timestamptz not null default now()
);

alter table public.case_reviews enable row level security;

drop policy if exists "Users can view own case reviews" on public.case_reviews;
create policy "Users can view own case reviews"
  on public.case_reviews for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own case reviews" on public.case_reviews;
create policy "Users can insert own case reviews"
  on public.case_reviews for insert
  with check (auth.uid() = user_id);
