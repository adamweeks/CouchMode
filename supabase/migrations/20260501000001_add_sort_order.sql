ALTER TABLE shows ADD COLUMN sort_order INT;
CREATE INDEX idx_shows_user_sort ON shows(user_id, sort_order);
