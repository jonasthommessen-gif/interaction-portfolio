-- Optional zoom/scale for project cover (Instagram-style). 1 = no zoom, >1 = zoom in.
alter table public.projects
  add column if not exists cover_object_scale real default 1;
