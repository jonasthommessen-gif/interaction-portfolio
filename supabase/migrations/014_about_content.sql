-- About page CMS: editable copy, portrait gallery, skills list.
alter table public.site_settings
  add column if not exists about_title text not null default '',
  add column if not exists about_body jsonb not null default '[]'::jsonb,
  add column if not exists about_portraits jsonb not null default '[]'::jsonb,
  add column if not exists about_skills jsonb not null default '[]'::jsonb;
