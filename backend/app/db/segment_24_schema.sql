-- Segment 24: Agentic Debate Prep Research Assistant
-- Run this once in your Supabase project's SQL Editor, in addition to
-- every earlier segment's schema file.

create table if not exists public.research_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null,
  position text,
  brief jsonb not null,
  queries_used jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  iterations integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.research_briefs enable row level security;

drop policy if exists "Users can view own research briefs" on public.research_briefs;
create policy "Users can view own research briefs"
  on public.research_briefs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own research briefs" on public.research_briefs;
create policy "Users can insert own research briefs"
  on public.research_briefs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own research briefs" on public.research_briefs;
create policy "Users can delete own research briefs"
  on public.research_briefs for delete
  using (auth.uid() = user_id);
