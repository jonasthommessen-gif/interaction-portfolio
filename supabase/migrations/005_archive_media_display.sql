-- Optional display options for archive media (crop/position in feed frame). Null = use defaults in UI.
alter table public.archive_media
  add column if not exists object_fit text,
  add column if not exists object_position text;
