-- Expand project_sections_layout_check to include scroll/carousel layouts
-- already used in the app, plus the new interactive layout.
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
    'project-overview',
    'media-scroll-x',
    'text-left-scroll-media-right',
    'scroll-media-left-text-right',
    'media-carousel',
    'text-left-carousel-right',
    'carousel-left-text-right',
    'interactive'
  )
);
