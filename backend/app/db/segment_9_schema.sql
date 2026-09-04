-- Segment 9: Recommendation & Coaching Engine (RAG)
-- Run this once in your Supabase project's SQL Editor, in addition to
-- schema.sql through segment_8 (Segment 8 had no schema file - that's
-- expected, see its guide).
--
-- IMPORTANT: after running this, you also need to run the Python seed
-- script once from your machine (see SEGMENT_9_GUIDE.md, step 2) to
-- actually populate coaching_knowledge with embedded content. This SQL
-- only creates the empty table and the similarity-search function.

create extension if not exists vector;

create table if not exists public.coaching_knowledge (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  content text not null,
  embedding vector(768),
  created_at timestamptz not null default now()
);

create index if not exists coaching_knowledge_embedding_idx
  on public.coaching_knowledge using hnsw (embedding vector_cosine_ops);

-- Vector similarity search isn't expressible through a plain PostgREST
-- filter (the `<=>` distance operator needs to appear in ORDER BY),
-- so it's exposed as a callable function instead - the backend calls
-- this via Supabase's RPC endpoint (POST /rest/v1/rpc/match_coaching_knowledge).
create or replace function match_coaching_knowledge(
  query_embedding vector(768),
  match_count int default 3,
  filter_category text default null
)
returns table (
  id uuid,
  category text,
  title text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    coaching_knowledge.id,
    coaching_knowledge.category,
    coaching_knowledge.title,
    coaching_knowledge.content,
    1 - (coaching_knowledge.embedding <=> query_embedding) as similarity
  from public.coaching_knowledge
  where filter_category is null or coaching_knowledge.category = filter_category
  order by coaching_knowledge.embedding <=> query_embedding
  limit match_count;
$$;

create table if not exists public.coaching_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  recommendations jsonb not null default '[]'::jsonb,
  skill_development_plan jsonb not null default '[]'::jsonb,
  learning_path jsonb not null default '[]'::jsonb,
  summary_feedback text,
  performance_snapshot jsonb,
  knowledge_used jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.coaching_plans enable row level security;

drop policy if exists "Users can view own coaching plans" on public.coaching_plans;
create policy "Users can view own coaching plans"
  on public.coaching_plans for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own coaching plans" on public.coaching_plans;
create policy "Users can insert own coaching plans"
  on public.coaching_plans for insert
  with check (auth.uid() = user_id);

-- coaching_knowledge is shared reference content, not per-user data.
-- The backend always reads it with the service key anyway, so this
-- policy is mostly documentation of intent for any future direct
-- frontend-to-Supabase access.
alter table public.coaching_knowledge enable row level security;

drop policy if exists "Anyone can read coaching knowledge" on public.coaching_knowledge;
create policy "Anyone can read coaching knowledge"
  on public.coaching_knowledge for select
  using (true);
