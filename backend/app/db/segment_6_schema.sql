-- Segment 6: Debate Session Management + Multi-Agent AI Debate Simulation
-- Run this once in your Supabase project's SQL Editor, in addition to
-- schema.sql through segment_5_schema.sql (which you should already
-- have run).

create table if not exists public.debate_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null,
  format text not null default 'ai_simulation'
    check (format in ('one_on_one','parliamentary','oxford','policy','public_forum','ai_simulation')),
  user_position text not null,
  ai_position text not null,
  status text not null default 'active' check (status in ('active','completed')),
  round_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.debate_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.debate_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  round_number integer not null,
  user_argument text not null,
  opponent_argument text not null,
  judge_feedback jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.debate_sessions enable row level security;
alter table public.debate_rounds enable row level security;

drop policy if exists "Users can view own debate sessions" on public.debate_sessions;
create policy "Users can view own debate sessions"
  on public.debate_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own debate sessions" on public.debate_sessions;
create policy "Users can insert own debate sessions"
  on public.debate_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own debate sessions" on public.debate_sessions;
create policy "Users can update own debate sessions"
  on public.debate_sessions for update
  using (auth.uid() = user_id);

drop policy if exists "Users can view own debate rounds" on public.debate_rounds;
create policy "Users can view own debate rounds"
  on public.debate_rounds for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own debate rounds" on public.debate_rounds;
create policy "Users can insert own debate rounds"
  on public.debate_rounds for insert
  with check (auth.uid() = user_id);
