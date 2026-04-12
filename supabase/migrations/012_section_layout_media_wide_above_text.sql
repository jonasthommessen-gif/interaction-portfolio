-- Allow section layout media-wide-above-text (full content-column media, natural height, above text).
alter table public.project_sections drop constraint if exists project_sections_layout_check;

alter table public.project_sections add constraint project_sections_layout_check check (
  layout in (
    'text-only',
    'text-left-media-right',
    'media-left-text-right',
    'full-bleed-media',
    'media-above-text',
    'media-wide-above-text',
    'gallery-strip',
    'project-overview'
  )
);
