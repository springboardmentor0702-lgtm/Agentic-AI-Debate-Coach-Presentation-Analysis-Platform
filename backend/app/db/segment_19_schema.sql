-- Segment 19: Admin Real Features
-- Run this once in your Supabase project's SQL Editor, in addition to
-- every earlier segment's schema file.

-- Generic key-value store for admin-configurable settings (starting
-- with the Peer Comparison minimum pool size) - persists across
-- backend restarts, unlike an in-memory value, and gives a reusable
-- pattern for any future admin-configurable setting without needing
-- a new migration each time.
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Read-only for everyone (the backend reads this on every comparison
-- request); writes only ever happen through the backend's service key
-- from an admin-gated endpoint, so no insert/update policy is needed
-- for authenticated users directly.
drop policy if exists "Anyone can read app settings" on public.app_settings;
create policy "Anyone can read app settings"
  on public.app_settings for select
  using (true);
