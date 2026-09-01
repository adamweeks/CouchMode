-- Per-user app preferences (home-screen options, etc.), synced across devices.
-- Stored as a JSONB blob keyed by user so new options can be added without a
-- schema change. The client merges this over its defaults, so unknown/missing
-- keys are tolerated.
create table user_preferences (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table user_preferences enable row level security;

create policy "users own their preferences"
  on user_preferences for all using (auth.uid() = user_id);

-- Match the explicit Data API grants used by the other tables (all app access
-- is authenticated; anon is never used).
grant select, insert, update, delete on public.user_preferences to authenticated;
