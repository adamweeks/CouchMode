-- Admin users table (managed via Supabase dashboard / service role only)
CREATE TABLE admin_users (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- No public policies — direct client access is intentionally blocked.
-- All reads go through SECURITY DEFINER functions below.

-- Seed with the initial admin account
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'adam.weeks@gmail.com'
ON CONFLICT DO NOTHING;

-- is_admin(): returns true if the current JWT user is in admin_users
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
$$;

-- Rebuild stats functions to delegate the admin check to is_admin()
CREATE OR REPLACE FUNCTION admin_get_overview()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN (
    SELECT json_build_object(
      'total_users',               (SELECT count(*) FROM auth.users),
      'new_users_7d',              (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
      'new_users_30d',             (SELECT count(*) FROM auth.users WHERE created_at > now() - interval '30 days'),
      'total_shows',               (SELECT count(*) FROM shows),
      'total_rewatches',           (SELECT count(*) FROM rewatches),
      'completed_rewatches',       (SELECT count(*) FROM rewatches WHERE status = 'completed'),
      'in_progress_rewatches',     (SELECT count(*) FROM rewatches WHERE status = 'in_progress'),
      'total_episodes_logged',     (SELECT count(*) FROM progress_logs),
      'users_with_shows',          (SELECT count(DISTINCT user_id) FROM shows),
      'avg_shows_per_active_user', (
        SELECT ROUND(count(*)::numeric / NULLIF(count(DISTINCT user_id), 0), 1)
        FROM shows
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION admin_get_user_list()
RETURNS TABLE(
  user_id         uuid,
  email           text,
  display_name    text,
  created_at      timestamptz,
  last_sign_in_at timestamptz,
  show_count      bigint,
  episode_count   bigint,
  rewatch_count   bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    u.id                                                                        AS user_id,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email)::text                AS display_name,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(s.show_count, 0)                                                  AS show_count,
    COALESCE(pl.episode_count, 0)                                              AS episode_count,
    COALESCE(r.rewatch_count, 0)                                               AS rewatch_count
  FROM auth.users u
  LEFT JOIN (SELECT user_id, count(*) AS show_count    FROM shows         GROUP BY user_id) s  ON s.user_id  = u.id
  LEFT JOIN (SELECT user_id, count(*) AS episode_count FROM progress_logs GROUP BY user_id) pl ON pl.user_id = u.id
  LEFT JOIN (SELECT user_id, count(*) AS rewatch_count FROM rewatches     GROUP BY user_id) r  ON r.user_id  = u.id
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION admin_get_popular_shows()
RETURNS TABLE(
  tmdb_id         text,
  title           text,
  poster_url      text,
  user_count      bigint,
  total_rewatches bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    s.tmdb_id,
    s.title,
    s.poster_url,
    count(DISTINCT s.user_id)          AS user_count,
    COALESCE(sum(rc.rewatch_count), 0) AS total_rewatches
  FROM shows s
  LEFT JOIN (
    SELECT show_id, count(*) AS rewatch_count FROM rewatches GROUP BY show_id
  ) rc ON rc.show_id = s.id
  GROUP BY s.tmdb_id, s.title, s.poster_url
  ORDER BY user_count DESC, total_rewatches DESC
  LIMIT 20;
END;
$$;
