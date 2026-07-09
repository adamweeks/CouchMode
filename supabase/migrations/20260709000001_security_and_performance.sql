-- Security & performance hardening:
--   1. Deduplicate progress_logs and enforce uniqueness per (rewatch, season, episode)
--   2. Index rewatches(user_id, status) for RLS + status filters
--   3. Tighten write policies so rows can only reference parents owned by the same user
--   4. get_rewatch_log_counts(): server-side log counts (avoids shipping full log rows
--      to the client, which silently truncates at the PostgREST max-rows cap)
--   5. Per-user rate limiting primitives used by the edge functions

-- 1) Remove duplicate progress logs (keep the earliest per position), then
--    enforce uniqueness so double-taps / concurrent devices can't duplicate.
DELETE FROM progress_logs p
WHERE EXISTS (
  SELECT 1 FROM progress_logs q
  WHERE q.rewatch_id = p.rewatch_id
    AND q.season = p.season
    AND q.episode = p.episode
    AND (q.logged_at, q.id) < (p.logged_at, p.id)
);

CREATE UNIQUE INDEX uq_progress_logs_rewatch_position
  ON progress_logs(rewatch_id, season, episode);

-- 2) Every rewatches query is filtered by the RLS predicate (user_id) and most
--    also filter on status; the table previously had no user_id index.
CREATE INDEX idx_rewatches_user_status ON rewatches(user_id, status);

-- 3) Defense in depth: inserts/updates may only reference a parent row owned by
--    the same user. (USING expressions are unchanged; WITH CHECK previously
--    defaulted to the USING clause, which only checked user_id.)
ALTER POLICY "users own their rewatches" ON rewatches
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM shows s WHERE s.id = show_id AND s.user_id = auth.uid())
  );

ALTER POLICY "users own their logs" ON progress_logs
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM rewatches r WHERE r.id = rewatch_id AND r.user_id = auth.uid())
  );

-- 4) Log counts per rewatch for the calling user. SECURITY INVOKER (default),
--    so progress_logs RLS scopes the result to the caller's own rows.
CREATE OR REPLACE FUNCTION get_rewatch_log_counts()
RETURNS TABLE(rewatch_id uuid, log_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT pl.rewatch_id, count(*)::bigint
  FROM progress_logs pl
  GROUP BY pl.rewatch_id
$$;

GRANT EXECUTE ON FUNCTION get_rewatch_log_counts() TO authenticated;

-- 5) Fixed-window per-user rate limiting, consumed by the edge functions
--    (tmdb-search, suggest-shows). No policies on the counters table: it is
--    only ever touched through the SECURITY DEFINER function below.
CREATE TABLE rate_limit_counters (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket       TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count        INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket)
);

ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION consume_rate_limit(bucket_name text, max_calls int, window_seconds int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO rate_limit_counters AS rlc (user_id, bucket, window_start, count)
  VALUES (auth.uid(), bucket_name, now(), 1)
  ON CONFLICT (user_id, bucket) DO UPDATE SET
    count = CASE
      WHEN rlc.window_start <= now() - make_interval(secs => window_seconds) THEN 1
      ELSE rlc.count + 1
    END,
    window_start = CASE
      WHEN rlc.window_start <= now() - make_interval(secs => window_seconds) THEN now()
      ELSE rlc.window_start
    END
  RETURNING rlc.count INTO current_count;

  RETURN current_count <= max_calls;
END;
$$;

REVOKE EXECUTE ON FUNCTION consume_rate_limit(text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION consume_rate_limit(text, int, int) TO authenticated;
