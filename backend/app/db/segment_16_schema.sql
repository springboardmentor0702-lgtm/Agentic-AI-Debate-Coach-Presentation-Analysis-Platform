-- Segment 16: Peer Comparison for Learners
-- Run this once in your Supabase project's SQL Editor, in addition to
-- every earlier segment's schema file.

alter table public.profiles
  add column if not exists participate_in_comparison boolean not null default false;
