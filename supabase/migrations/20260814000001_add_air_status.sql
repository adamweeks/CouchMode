-- Cache each show's air schedule (TMDB status + last/next aired episode) so the
-- app can surface "caught up" shows and upcoming-episode dates without a live
-- TMDB call. Refreshed alongside streaming providers on the same TTL.
alter table shows
  add column if not exists air_status jsonb,
  add column if not exists air_status_updated_at timestamptz;
