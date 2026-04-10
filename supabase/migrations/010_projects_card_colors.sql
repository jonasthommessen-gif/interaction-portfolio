-- Optional mosaic card styling (hex). Null = use automatic colors from cover/gradient.
alter table public.projects
  add column if not exists card_title_color text null,
  add column if not exists card_pill_background text null;
