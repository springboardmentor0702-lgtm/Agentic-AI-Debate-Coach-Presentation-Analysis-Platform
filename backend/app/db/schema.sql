-- Segment 1: User Profile & Skill Management
-- Run this once in your Supabase project's SQL Editor (see SETUP.md).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'learner'
    check (role in ('learner', 'debate_coach', 'educator', 'admin')),
  experience_level text,
  preferred_debate_topics text[],
  presentation_domains text[],
  learning_goals text,
  coaching_preferences text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- The backend uses your service-role key for all profile operations,
-- which bypasses RLS entirely. These policies exist as defense in
-- depth, and matter as soon as any part of the app queries Supabase
-- directly from the browser (e.g. real-time features in a later
-- segment) instead of going through the backend.

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
