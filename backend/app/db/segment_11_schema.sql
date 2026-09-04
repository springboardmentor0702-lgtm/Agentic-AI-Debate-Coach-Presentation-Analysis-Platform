-- Segment 11: Notification & Engagement System
-- Run this once in your Supabase project's SQL Editor, in addition to
-- every earlier segment's schema file.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('debate_result', 'coaching_ready', 'milestone')),
  title text not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
alter table public.announcements enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Announcements are broadcast, not per-user - the backend always uses
-- the service key to write these anyway (only admins can, enforced in
-- the API layer), so this policy only matters for reading.
drop policy if exists "Anyone can read announcements" on public.announcements;
create policy "Anyone can read announcements"
  on public.announcements for select
  using (true);
