-- Add optional description to projects (sidebar under title)
alter table public.projects
  add column if not exists description text default null;
