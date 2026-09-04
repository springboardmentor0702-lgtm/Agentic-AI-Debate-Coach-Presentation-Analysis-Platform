-- Segment 26: Easy Wins Bundle
-- Run this once in your Supabase project's SQL Editor, in addition to
-- every earlier segment's schema file.

create table if not exists public.debate_topics (
  id uuid primary key default gen_random_uuid(),
  topic text not null unique,
  category text not null,
  created_at timestamptz not null default now()
);

-- Everyone can read the topic library - it's not user-specific data.
alter table public.debate_topics enable row level security;
drop policy if exists "Anyone can view debate topics" on public.debate_topics;
create policy "Anyone can view debate topics"
  on public.debate_topics for select
  using (true);

insert into public.debate_topics (topic, category) values
  ('This house believes social media should be regulated', 'Technology'),
  ('AI development should be paused for safety review', 'Technology'),
  ('Standardized testing should be abolished', 'Education'),
  ('College education should be free', 'Education'),
  ('Homework does more harm than good', 'Education'),
  ('Universal basic income would reduce poverty', 'Economics'),
  ('The minimum wage should be significantly raised', 'Economics'),
  ('Cryptocurrency should be more heavily regulated', 'Economics'),
  ('Nuclear energy is the best path to decarbonization', 'Environment'),
  ('Individual action matters more than systemic change for climate', 'Environment'),
  ('Zoos do more harm than good', 'Environment'),
  ('Voting should be mandatory', 'Politics'),
  ('Term limits should apply to all elected officials', 'Politics'),
  ('The voting age should be lowered to 16', 'Politics'),
  ('Animal testing is never ethically justified', 'Ethics'),
  ('Lying is sometimes morally acceptable', 'Ethics'),
  ('Wealthy nations have an obligation to accept more refugees', 'Ethics'),
  ('Remote work is better for productivity than office work', 'Society'),
  ('Social media has made public discourse worse', 'Society'),
  ('A four-day work week should become the standard', 'Society'),
  ('Space exploration funding is justified given problems on Earth', 'Science'),
  ('Gene editing in humans should be allowed for non-medical traits', 'Science'),
  ('This house would ban single-use plastics entirely', 'Environment'),
  ('Professional athletes are paid too much', 'Society'),
  ('Standardized school uniforms should be mandatory', 'Education')
on conflict do nothing;
