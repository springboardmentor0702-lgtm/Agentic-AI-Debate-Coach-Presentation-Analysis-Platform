-- Segment 23: Human-vs-Human Debate Mode
-- Run this once in your Supabase project's SQL Editor, in addition to
-- every earlier segment's schema file.

-- Deliberately does NOT touch the existing `status` column or its
-- constraint (whose exact current definition isn't something to
-- guess at and risk breaking) - a pending human-vs-human invite is
-- represented entirely by the new `invite_status` column below, which
-- this migration fully owns. A session's `status` continues to mean
-- exactly what it always has.
alter table public.debate_sessions
  add column if not exists mode text not null default 'ai_simulation'
    check (mode in ('ai_simulation', 'human_vs_human')),
  add column if not exists opponent_id uuid references public.profiles(id) on delete set null,
  add column if not exists invite_status text
    check (invite_status in ('pending', 'accepted', 'declined'));
