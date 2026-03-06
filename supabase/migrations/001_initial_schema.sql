-- Portfolio CMS: projects, project_sections, archive_posts, archive_media
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query) or via Supabase CLI.

-- Projects (main case studies)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  categories text[] default '{}',
  gradient_from text not null default '#6D28D9',
  gradient_to text not null default '#22D3EE',
  cover_type text not null check (cover_type in ('image', 'video')) default 'image',
  cover_src text not null default '',
  cover_poster text,
  cover_alt text default '',
  visible boolean not null default true,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Project sections (custom sections per project with preset layout)
create table if not exists public.project_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  "order" int not null default 0,
  label text not null,
  layout text not null check (layout in (
    'text-only',
    'text-left-media-right',
    'media-left-text-right',
    'full-bleed-media',
    'media-above-text',
    'gallery-strip'
  )),
  content jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_sections_project_id on public.project_sections(project_id);

-- Archive posts (Instagram-style)
create table if not exists public.archive_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  tags text[] default '{}',
  categories text[] default '{}',
  duration text default '',
  cover_src text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Archive media items (images/videos per post)
create table if not exists public.archive_media (
  id uuid primary key default gen_random_uuid(),
  archive_id uuid not null references public.archive_posts(id) on delete cascade,
  "order" int not null default 0,
  type text not null check (type in ('image', 'video')),
  src text not null,
  alt text default '',
  created_at timestamptz not null default now()
);

create index if not exists archive_media_archive_id on public.archive_media(archive_id);

-- RLS: allow public read for projects and archive; only authenticated (admin) can write
alter table public.projects enable row level security;
alter table public.project_sections enable row level security;
alter table public.archive_posts enable row level security;
alter table public.archive_media enable row level security;

create policy "Projects are viewable by everyone"
  on public.projects for select using (true);

create policy "Projects are editable by authenticated users"
  on public.projects for all using (auth.role() = 'authenticated');

create policy "Project sections are viewable by everyone"
  on public.project_sections for select using (true);

create policy "Project sections are editable by authenticated users"
  on public.project_sections for all using (auth.role() = 'authenticated');

create policy "Archive posts are viewable by everyone"
  on public.archive_posts for select using (true);

create policy "Archive posts are editable by authenticated users"
  on public.archive_posts for all using (auth.role() = 'authenticated');

create policy "Archive media are viewable by everyone"
  on public.archive_media for select using (true);

create policy "Archive media are editable by authenticated users"
  on public.archive_media for all using (auth.role() = 'authenticated');

-- Storage bucket for uploaded media (projects + archive)
insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do nothing;

-- Allow public read; only authenticated can upload/update/delete
create policy "Portfolio media is viewable by everyone"
  on storage.objects for select using (bucket_id = 'portfolio-media');

create policy "Portfolio media is editable by authenticated users"
  on storage.objects for all using (bucket_id = 'portfolio-media' and auth.role() = 'authenticated');
