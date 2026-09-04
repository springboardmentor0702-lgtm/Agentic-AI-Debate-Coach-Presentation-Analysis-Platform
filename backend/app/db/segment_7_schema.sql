-- Segment 7: Presentation Analysis Engine
-- Run this once in your Supabase project's SQL Editor, in addition to
-- schema.sql through segment_6_schema.sql (which you should already
-- have run).

create table if not exists public.presentation_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  transcript text not null,
  topic text,
  duration_seconds numeric not null,
  pace jsonb not null default '{}'::jsonb,
  filler_words jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  overall_score numeric,
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  summary_feedback text,
  created_at timestamptz not null default now()
);

alter table public.presentation_analyses enable row level security;

drop policy if exists "Users can view own presentation analyses" on public.presentation_analyses;
create policy "Users can view own presentation analyses"
  on public.presentation_analyses for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own presentation analyses" on public.presentation_analyses;
create policy "Users can insert own presentation analyses"
  on public.presentation_analyses for insert
  with check (auth.uid() = user_id);
