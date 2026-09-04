-- Segment 2: Argument Analysis Engine
-- Run this once in your Supabase project's SQL Editor, in addition to
-- schema.sql from Segment 1 (which you should already have run).

create extension if not exists pgcrypto;

create table if not exists public.argument_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  input_text text not null,
  topic text,
  claims jsonb not null default '[]'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  overall_score numeric,
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  summary_feedback text,
  created_at timestamptz not null default now()
);

alter table public.argument_analyses enable row level security;

drop policy if exists "Users can view own analyses" on public.argument_analyses;
create policy "Users can view own analyses"
  on public.argument_analyses for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own analyses" on public.argument_analyses;
create policy "Users can insert own analyses"
  on public.argument_analyses for insert
  with check (auth.uid() = user_id);
