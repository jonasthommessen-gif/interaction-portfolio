-- Allow section layout full-bleed-media-natural (full-bleed stack + caption, natural height / uncropped media).
alter table public.project_sections drop constraint if exists project_sections_layout_check;

alter table public.project_sections add constraint project_sections_layout_check check (
  layout in (
    'text-only',
    'text-left-media-right',
    'media-left-text-right',
    'full-bleed-media',
    'full-bleed-media-natural',
    'media-above-text',
    'media-wide-above-text',
    'gallery-strip',
    'project-overview'
  )
);
