-- Optional crop/position for project cover (front card). Null = center (50% 50%).
alter table public.projects
  add column if not exists cover_object_position text;
