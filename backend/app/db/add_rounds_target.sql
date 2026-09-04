-- Adds a real, user-chosen round target to debate sessions, stored on
-- the row so it survives a refresh and both participants in a
-- human-vs-human debate see the SAME number (rather than each side
-- guessing from the format's suggested default).
--
-- Nullable and safe for existing rows: any debate created before this
-- migration simply has rounds_target = null, and the frontend falls
-- back to the format's suggested round count exactly as it did before -
-- no existing debate's behavior changes.

alter table public.debate_sessions
  add column if not exists rounds_target integer;
