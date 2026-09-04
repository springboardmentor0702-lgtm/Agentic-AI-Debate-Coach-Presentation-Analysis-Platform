-- Segment 23 follow-up fix: allow a partial debate_rounds row
--
-- debate_rounds was originally built (Segment 6) for AI mode only,
-- where a round is always inserted complete in one shot - the AI's
-- argument and the judge's feedback are generated instantly, so
-- opponent_argument and judge_feedback were never null. Segment 23's
-- human-vs-human mode introduced a genuinely new idea: a round that's
-- opened by one person and only completed once the other person
-- responds - which means these two columns need to be nullable now.
--
-- Safe to run even if these columns are already nullable - dropping
-- a NOT NULL constraint that isn't there is a harmless no-op.
alter table public.debate_rounds
  alter column opponent_argument drop not null,
  alter column judge_feedback drop not null;
