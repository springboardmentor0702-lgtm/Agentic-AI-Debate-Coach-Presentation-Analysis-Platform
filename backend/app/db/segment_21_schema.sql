-- Segment 21: Classes & Cohorts
-- Run this once in your Supabase project's SQL Editor, in addition to
-- every earlier segment's schema file.

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (class_id, learner_id)
);

alter table public.classes enable row level security;
alter table public.class_members enable row level security;

drop policy if exists "Coaches can view their own classes" on public.classes;
create policy "Coaches can view their own classes"
  on public.classes for select
  using (auth.uid() = created_by);

drop policy if exists "Coaches can view their own class memberships" on public.class_members;
create policy "Coaches can view their own class memberships"
  on public.class_members for select
  using (
    exists (
      select 1 from public.classes
      where classes.id = class_members.class_id
      and classes.created_by = auth.uid()
    )
  );
