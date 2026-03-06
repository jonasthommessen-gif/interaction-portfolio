-- Add visible and order to archive_posts (same pattern as projects)
alter table public.archive_posts
  add column if not exists visible boolean not null default true,
  add column if not exists "order" int not null default 0;
