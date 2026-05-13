-- Explicit Data API grants required by Supabase's upcoming enforcement
-- (https://github.com/orgs/supabase/discussions/45329, enforced Oct 30 2026).
-- All app access is authenticated; anon role is not needed (all routes are protected).
grant select, insert, update, delete on public.shows          to authenticated;
grant select, insert, update, delete on public.rewatches      to authenticated;
grant select, insert, update, delete on public.progress_logs  to authenticated;
