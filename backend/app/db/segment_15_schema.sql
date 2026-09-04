-- Segment 15: Goals & Session Scheduling
-- Run this once in your Supabase project's SQL Editor, in addition to
-- every earlier segment's schema file.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  metric text not null check (metric in (
    'overall_score', 'argument_quality', 'evidence_usage',
    'logical_consistency', 'rebuttal_effectiveness', 'communication_skills'
  )),
  target_value numeric not null check (target_value > 0 and target_value <= 10),
  deadline date,
  status text not null default 'active' check (status in ('active', 'achieved')),
  achieved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;

drop policy if exists "Users can view own goals" on public.goals;
create policy "Users can view own goals"
  on public.goals for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own goals" on public.goals;
create policy "Users can insert own goals"
  on public.goals for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own goals" on public.goals;
create policy "Users can update own goals"
  on public.goals for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own goals" on public.goals;
create policy "Users can delete own goals"
  on public.goals for delete
  using (auth.uid() = user_id);

-- Session scheduling: an optional future date/time on a debate
-- session. Surfaced as a live-computed reminder (same pattern as
-- Segment 11's active-debate reminders) - no scheduler infrastructure
-- needed, since it's just a column checked whenever reminders are
-- fetched.
alter table public.debate_sessions
  add column if not exists scheduled_for timestamptz;
