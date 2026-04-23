CREATE TYPE rewatch_status AS ENUM ('in_progress', 'completed');

CREATE TABLE shows (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id             TEXT NOT NULL,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  poster_url          TEXT,
  total_seasons       INT NOT NULL DEFAULT 1,
  episodes_per_season INT[] NOT NULL DEFAULT '{}',
  added_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tmdb_id, user_id)
);

CREATE TABLE rewatches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id      UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status       rewatch_status NOT NULL DEFAULT 'in_progress',
  note         TEXT
);

CREATE TABLE progress_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rewatch_id  UUID NOT NULL REFERENCES rewatches(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season      INT NOT NULL,
  episode     INT NOT NULL,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  note        TEXT
);

ALTER TABLE shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own their shows"
  ON shows FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users own their rewatches"
  ON rewatches FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users own their logs"
  ON progress_logs FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_shows_user             ON shows(user_id);
CREATE INDEX idx_rewatches_show         ON rewatches(show_id);
CREATE INDEX idx_progress_logs_rewatch  ON progress_logs(rewatch_id);
CREATE INDEX idx_progress_logs_user     ON progress_logs(user_id);
