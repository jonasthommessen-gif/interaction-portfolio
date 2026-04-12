-- Allow project-overview section layout (facts-only preset).
alter table public.project_sections drop constraint if exists project_sections_layout_check;

alter table public.project_sections add constraint project_sections_layout_check check (
  layout in (
    'text-only',
    'text-left-media-right',
    'media-left-text-right',
    'full-bleed-media',
    'media-above-text',
    'gallery-strip',
    'project-overview'
  )
);
