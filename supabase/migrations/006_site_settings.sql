-- Single-row site settings (e.g. About page portrait). id = 1 always.
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  about_portrait_src text not null default '',
  about_portrait_alt text not null default '',
  updated_at timestamptz not null default now()
);

-- Ensure single row exists
insert into public.site_settings (id, about_portrait_src, about_portrait_alt)
values (1, '', '')
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

create policy "Site settings are viewable by everyone"
  on public.site_settings for select using (true);

create policy "Site settings are editable by authenticated users"
  on public.site_settings for all using (auth.role() = 'authenticated');
