alter table shows
  add column if not exists streaming_providers jsonb,
  add column if not exists providers_updated_at timestamptz;
