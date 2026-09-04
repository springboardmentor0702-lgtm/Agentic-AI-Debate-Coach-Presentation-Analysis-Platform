-- Segment 22: Usernames
-- Run this once in your Supabase project's SQL Editor, in addition to
-- every earlier segment's schema file.

alter table public.profiles
  add column if not exists username text;

-- Case-insensitive uniqueness ("Alice" and "alice" are the same
-- username) enforced at the database level, not just in application
-- code - a unique index on lower(username) rather than a plain unique
-- constraint on the column itself, so the ORIGINAL casing a person
-- typed is still what gets stored and displayed. NULL is allowed and
-- doesn't violate uniqueness (needed since every account created
-- before this migration has no username yet).
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));
