-- Segment 25: Agentic Coaching Upgrade
-- Run this once in your Supabase project's SQL Editor, in addition to
-- every earlier segment's schema file.

create table if not exists public.coaching_agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  response text not null,
  tools_used jsonb not null default '[]'::jsonb,
  iterations integer not null default 0,
  proposed_goal jsonb,
  created_at timestamptz not null default now()
);

alter table public.coaching_agent_sessions enable row level security;

drop policy if exists "Users can view own coaching agent sessions" on public.coaching_agent_sessions;
create policy "Users can view own coaching agent sessions"
  on public.coaching_agent_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own coaching agent sessions" on public.coaching_agent_sessions;
create policy "Users can insert own coaching agent sessions"
  on public.coaching_agent_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own coaching agent sessions" on public.coaching_agent_sessions;
create policy "Users can delete own coaching agent sessions"
  on public.coaching_agent_sessions for delete
  using (auth.uid() = user_id);
