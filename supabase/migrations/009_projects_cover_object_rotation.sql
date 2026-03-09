-- Rotation in degrees (0 = none). Applied with scale/position for project cover.
alter table public.projects
  add column if not exists cover_object_rotation real default 0;
