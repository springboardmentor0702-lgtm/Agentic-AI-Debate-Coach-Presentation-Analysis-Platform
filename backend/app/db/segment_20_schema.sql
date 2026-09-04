-- Segment 20: Coach & Educator Real Features
-- Run this once in your Supabase project's SQL Editor, in addition to
-- every earlier segment's schema file.

-- Lets a coach/educator/admin assign a goal TO a learner, distinct
-- from a learner setting their own (Segment 15). Null means
-- self-created, same as before - nothing about existing goals changes.
alter table public.goals
  add column if not exists assigned_by uuid references public.profiles(id) on delete set null;

-- Manual, human coaching feedback on a specific piece of a learner's
-- work - item_type/item_id point at whichever tool's table the
-- feedback is about (e.g. item_type='argument_analyses'), not a
-- foreign key, since it can point into any of several different
-- tables depending on which tool the work came from.
create table if not exists public.coach_feedback (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  learner_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null,
  item_id uuid not null,
  feedback_text text not null,
  created_at timestamptz not null default now()
);

alter table public.coach_feedback enable row level security;

drop policy if exists "Learners and the coach can view feedback" on public.coach_feedback;
create policy "Learners and the coach can view feedback"
  on public.coach_feedback for select
  using (auth.uid() = learner_id or auth.uid() = coach_id);

-- Expand the notifications type check to cover the three new event
-- kinds this segment introduces.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'debate_result', 'coaching_ready', 'milestone',
    'topic_suggestion', 'feedback', 'goal_assigned'
  ));
