-- Segment 14: Historical Tracking & Trend Analytics
-- Run this once in your Supabase project's SQL Editor, in addition to
-- every earlier segment's schema file.

create table if not exists public.performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  overall_score numeric,
  components jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.performance_snapshots enable row level security;

drop policy if exists "Users can view own performance snapshots" on public.performance_snapshots;
create policy "Users can view own performance snapshots"
  on public.performance_snapshots for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own performance snapshots" on public.performance_snapshots;
create policy "Users can insert own performance snapshots"
  on public.performance_snapshots for insert
  with check (auth.uid() = user_id);
