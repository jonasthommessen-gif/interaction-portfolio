-- Seed projects table with the same static content as src/content/projects.ts
-- Run after 001_initial_schema.sql (and 002_projects_description.sql if you use description).
-- Safe to re-run: existing slugs are skipped (on conflict do nothing).

insert into public.projects (
  slug,
  title,
  categories,
  gradient_from,
  gradient_to,
  cover_type,
  cover_src,
  cover_alt,
  visible,
  "order"
)
values
  ('kinetic-cards', 'Kinetic Cards', array['Motion', 'UI', 'Prototype'], '#6D28D9', '#22D3EE', 'image', '/images/placeholders/DSCF0184.JPG', '', true, 0),
  ('micro-interactions', 'Micro Interactions', array['Interaction', 'System', 'Motion'], '#F97316', '#F43F5E', 'image', '/images/placeholders/IMG_1596.JPG', '', true, 1),
  ('case-study-template', 'Case Study Template', array['Narrative', 'Layout', 'UX'], '#10B981', '#A3E635', 'image', '/images/placeholders/IMG_0045.JPG', '', true, 2),
  ('responsive-mosaic', 'Responsive Mosaic', array['Grid', 'CSS', 'Interaction'], '#38BDF8', '#A78BFA', 'image', '/images/placeholders/IMG_0115.JPG', '', true, 3),
  ('frictionless-navigation', 'Frictionless Navigation', array['Navigation', 'IA', 'UX'], '#F43F5E', '#FBBF24', 'image', '/images/placeholders/IMG_0259.jpeg', '', true, 4),
  ('visual-language', 'Visual Language', array['Brand', 'Typography', 'Motion'], '#22C55E', '#14B8A6', 'image', '/images/placeholders/IMG_1484.JPG', '', true, 5)
on conflict (slug) do nothing;
