-- Segment 3: Logical Fallacy Detection Engine
-- Run this once in your Supabase project's SQL Editor, in addition to
-- schema.sql and segment_2_schema.sql (which you should already have run).

create table if not exists public.fallacy_detections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input_text text not null,
  topic text,
  fallacies_detected jsonb not null default '[]'::jsonb,
  credibility_score numeric,
  reasoning_analysis text,
  created_at timestamptz not null default now()
);

alter table public.fallacy_detections enable row level security;

drop policy if exists "Users can view own fallacy detections" on public.fallacy_detections;
create policy "Users can view own fallacy detections"
  on public.fallacy_detections for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own fallacy detections" on public.fallacy_detections;
create policy "Users can insert own fallacy detections"
  on public.fallacy_detections for insert
  with check (auth.uid() = user_id);
