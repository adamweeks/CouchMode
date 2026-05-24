-- Switch admin_get_user_list and admin_get_popular_shows from RETURNS TABLE
-- to RETURNS json for compatibility with PostgREST RPC (same pattern as
-- admin_get_overview, which works correctly).

DROP FUNCTION IF EXISTS admin_get_user_list();
DROP FUNCTION IF EXISTS admin_get_popular_shows();

CREATE FUNCTION admin_get_user_list()
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
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json)
    FROM (
      SELECT
        u.id::text                                                             AS user_id,
        u.email::text,
        COALESCE(u.raw_user_meta_data->>'full_name', u.email)::text            AS display_name,
        u.created_at,
        u.last_sign_in_at,
        COALESCE(s.show_count,    0)::int                                      AS show_count,
        COALESCE(pl.episode_count,0)::int                                      AS episode_count,
        COALESCE(r.rewatch_count, 0)::int                                      AS rewatch_count
      FROM auth.users u
      LEFT JOIN (SELECT user_id, count(*) AS show_count    FROM shows         GROUP BY user_id) s  ON s.user_id  = u.id
      LEFT JOIN (SELECT user_id, count(*) AS episode_count FROM progress_logs GROUP BY user_id) pl ON pl.user_id = u.id
      LEFT JOIN (SELECT user_id, count(*) AS rewatch_count FROM rewatches     GROUP BY user_id) r  ON r.user_id  = u.id
    ) t
  );
END;
$$;

CREATE FUNCTION admin_get_popular_shows()
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
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.user_count DESC, t.total_rewatches DESC), '[]'::json)
    FROM (
      SELECT
        s.tmdb_id,
        s.title,
        s.poster_url,
        count(DISTINCT s.user_id)::int          AS user_count,
        COALESCE(sum(rc.rewatch_count), 0)::int AS total_rewatches
      FROM shows s
      LEFT JOIN (
        SELECT show_id, count(*) AS rewatch_count FROM rewatches GROUP BY show_id
      ) rc ON rc.show_id = s.id
      GROUP BY s.tmdb_id, s.title, s.poster_url
      ORDER BY user_count DESC, total_rewatches DESC
      LIMIT 20
    ) t
  );
END;
$$;
