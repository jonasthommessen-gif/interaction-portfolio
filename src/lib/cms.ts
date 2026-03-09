/**
 * CMS data layer: fetch projects and archive from Supabase.
 * When Supabase is not configured, falls back to static content.
 */

import { supabase } from './supabase'
import type { Project, ArchiveProject, ProjectRow, ProjectSectionRow, ArchivePostRow, ArchiveMediaRow } from '../types/cms'
import { projects as staticProjectsRaw } from '../content/projects'
import { archiveProjects as staticArchive } from '../content/archiveProjects'

const staticProjects: Project[] = staticProjectsRaw.map((p, i) => ({
  ...p,
  visible: true,
  order: i,
  sections: [],
}))

const HEX = /^#[0-9A-Fa-f]+$/

function toHex(s: string): `#${string}` {
  return HEX.test(s) ? (s as `#${string}`) : (`#${s.replace(/^#/, '')}` as `#${string}`)
}

function projectRowToProject(row: ProjectRow, sections: ProjectSectionRow[]): Project {
  const objectPosition = row.cover_object_position ?? undefined
  const cover =
    row.cover_type === 'video'
      ? { type: 'video' as const, src: row.cover_src, poster: row.cover_poster ?? undefined, objectPosition }
      : { type: 'image' as const, src: row.cover_src, alt: row.cover_alt || '', objectPosition }
  const sortedSections = [...sections].sort((a, b) => a.order - b.order)
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    categories: row.categories ?? [],
    gradient: { from: toHex(row.gradient_from), to: toHex(row.gradient_to) },
    cover,
    visible: row.visible,
    order: row.order,
    sections: sortedSections.map((s) => ({
      id: s.id,
      label: s.label,
      layout: s.layout,
      content: (s.content as Project['sections'][0]['content']) ?? {},
      order: s.order,
    })),
  }
}

/** Reason the projects list is from static content (no ids). Used by admin to show actionable message. */
export async function getProjectsStaticReason(): Promise<
  { reason: 'no-env' } | { reason: 'error'; errorMessage: string } | { reason: 'empty' } | null
> {
  if (!supabase) return { reason: 'no-env' }
  const { data, error } = await supabase.from('projects').select('id').limit(1)
  if (error) return { reason: 'error', errorMessage: error.message }
  if (!data?.length) return { reason: 'empty' }
  return null
}

/** Admin: insert static projects into the database. Skips slugs that already exist. Call when table is empty to enable reorder/visibility/delete. */
export async function importStaticProjectsToDb(): Promise<
  { imported: number; errors?: string[] } | { error: string }
> {
  if (!supabase) return { error: 'Database not configured' }
  const errors: string[] = []
  let imported = 0
  for (let order = 0; order < staticProjectsRaw.length; order++) {
    const p = staticProjectsRaw[order]
    const row = {
      slug: p.slug,
      title: p.title,
      categories: p.categories ?? [],
      gradient_from: p.gradient.from,
      gradient_to: p.gradient.to,
      cover_type: p.cover.type,
      cover_src: p.cover.src,
      cover_poster: p.cover.type === 'video' ? (p.cover.poster ?? null) : null,
      cover_alt: p.cover.type === 'image' ? p.cover.alt ?? '' : '',
      visible: true,
      order,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('projects').insert(row)
    if (error) {
      if (error.code === '23505') {
        // unique violation on slug – already exists, skip
        continue
      }
      errors.push(`${p.slug}: ${error.message}`)
    } else {
      imported += 1
    }
  }
  return { imported, errors: errors.length ? errors : undefined }
}

export async function fetchProjects(): Promise<Project[]> {
  if (!supabase) return staticProjects
  const { data: rows, error } = await supabase
    .from('projects')
    .select('*')
    .order('order', { ascending: true })
  if (error) {
    console.warn('CMS fetch projects:', error)
    return staticProjects
  }
  if (!rows?.length) return staticProjects
  const projectIds = (rows as ProjectRow[]).map((r) => r.id)
  const { data: sectionRows } = await supabase
    .from('project_sections')
    .select('*')
    .in('project_id', projectIds)
  const sections = (sectionRows ?? []) as ProjectSectionRow[]
  return (rows as ProjectRow[]).map((r) =>
    projectRowToProject(r, sections.filter((s) => s.project_id === r.id))
  )
}

export async function fetchVisibleProjects(): Promise<Project[]> {
  const all = await fetchProjects()
  return all.filter((p) => p.visible).sort((a, b) => a.order - b.order)
}

export async function fetchProjectBySlug(slug: string): Promise<Project | undefined> {
  const all = await fetchProjects()
  return all.find((p) => p.slug === slug)
}

/** Admin: fetch raw project row by slug (includes id for updates). Returns null if no Supabase or not found. */
export async function fetchProjectRowBySlug(slug: string): Promise<ProjectRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.warn('CMS fetch project row:', error)
    return null
  }
  return (data as ProjectRow) ?? null
}

/** Admin: create a new project. Returns the new slug on success. New project gets order = max(order) + 1 so it appears at the end. */
export async function createProject(params: {
  title: string
  slug: string
}): Promise<{ slug?: string; error: string | null }> {
  if (!supabase) return { error: 'Database not configured' }
  const { data: maxRow } = await supabase
    .from('projects')
    .select('order')
    .order('order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = maxRow?.order != null ? maxRow.order + 1 : 0
  const { data, error } = await supabase
    .from('projects')
    .insert({
      title: params.title.trim(),
      slug: params.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      order: nextOrder,
      updated_at: new Date().toISOString(),
    })
    .select('slug')
    .single()
  if (error) {
    console.warn('CMS create project:', error)
    return { error: error.message }
  }
  return { slug: (data as { slug: string })?.slug ?? undefined, error: null }
}

/** Admin: update project by id. */
export async function updateProject(
  id: string,
  patch: {
    title?: string
    slug?: string
    description?: string | null
    categories?: string[]
    visible?: boolean
    order?: number
    cover_type?: 'image' | 'video'
    cover_src?: string
    cover_poster?: string | null
    cover_alt?: string
    cover_object_position?: string | null
  }
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Database not configured' }
  const { error } = await supabase
    .from('projects')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) {
    console.warn('CMS update project:', error)
    return { error: error.message }
  }
  return { error: null }
}

/** Admin: delete project by id (and its sections via cascade). */
export async function deleteProject(id: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Database not configured' }
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) {
    console.warn('CMS delete project:', error)
    return { error: error.message }
  }
  return { error: null }
}

/** Admin: fetch sections for a project. */
export async function fetchProjectSections(projectId: string): Promise<ProjectSectionRow[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('project_sections')
    .select('*')
    .eq('project_id', projectId)
    .order('order', { ascending: true })
  if (error) {
    console.warn('CMS fetch project sections:', error)
    return []
  }
  return (data as ProjectSectionRow[]) ?? []
}

/** Admin: create a section. */
export async function createProjectSection(
  projectId: string,
  params: { label: string; layout: ProjectSectionRow['layout']; order: number; content?: ProjectSectionRow['content'] }
): Promise<{ id?: string; error: string | null }> {
  if (!supabase) return { error: 'Database not configured' }
  const { data, error } = await supabase
    .from('project_sections')
    .insert({
      project_id: projectId,
      label: params.label.trim(),
      layout: params.layout,
      order: params.order,
      content: params.content ?? {},
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) {
    console.warn('CMS create section:', error)
    return { error: error.message }
  }
  return { id: (data as { id: string })?.id, error: null }
}

/** Admin: update a section. */
export async function updateProjectSection(
  id: string,
  patch: { label?: string; layout?: ProjectSectionRow['layout']; order?: number; content?: ProjectSectionRow['content'] }
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Database not configured' }
  const { error } = await supabase
    .from('project_sections')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) {
    console.warn('CMS update section:', error)
    return { error: error.message }
  }
  return { error: null }
}

/** Admin: delete a section. */
export async function deleteProjectSection(id: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Database not configured' }
  const { error } = await supabase.from('project_sections').delete().eq('id', id)
  if (error) {
    console.warn('CMS delete section:', error)
    return { error: error.message }
  }
  return { error: null }
}

function archiveRowsToArchivePost(post: ArchivePostRow, media: ArchiveMediaRow[]): ArchiveProject {
  const sorted = [...media].sort((a, b) => a.order - b.order)
  return {
    id: post.id,
    title: post.title,
    description: post.description,
    tags: post.tags ?? [],
    categories: post.categories ?? [],
    duration: post.duration ?? '',
    cover: post.cover_src,
    visible: post.visible ?? true,
    order: post.order ?? 0,
    images: sorted.filter((m) => m.type === 'image').map((m) => m.src),
    media: sorted.map((m) => ({
      type: m.type,
      src: m.src,
      alt: m.alt ?? undefined,
      objectFit: m.object_fit ?? undefined,
      objectPosition: m.object_position ?? undefined,
    })),
  }
}

const staticArchiveNormalized: ArchiveProject[] = staticArchive.map((a, i) => ({
  ...a,
  categories: 'categories' in a ? (a as ArchiveProject).categories : [],
  visible: true,
  order: i,
  media: (a.images ?? []).map((src) => ({ type: 'image' as const, src })),
}))

export type SiteSettings = {
  about_portrait_src: string | null
  about_portrait_alt: string | null
}

/** Fetch site settings (single row). Returns null if no Supabase or error. */
export async function fetchSiteSettings(): Promise<SiteSettings | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('site_settings')
    .select('about_portrait_src, about_portrait_alt')
    .eq('id', 1)
    .maybeSingle()
  if (error) {
    console.warn('CMS fetch site settings:', error)
    return null
  }
  if (!data) return null
  return {
    about_portrait_src: (data as { about_portrait_src: string | null }).about_portrait_src ?? null,
    about_portrait_alt: (data as { about_portrait_alt: string | null }).about_portrait_alt ?? null,
  }
}

/** Admin: update site settings (single row). */
export async function updateSiteSettings(patch: {
  about_portrait_src?: string
  about_portrait_alt?: string
}): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Database not configured' }
  const { error } = await supabase
    .from('site_settings')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
  if (error) {
    console.warn('CMS update site settings:', error)
    return { error: error.message }
  }
  return { error: null }
}

/** Admin: upload a file to portfolio-media and return its public URL. */
export async function uploadPortfolioMedia(file: File, folder = 'archive'): Promise<{ url?: string; error: string | null }> {
  if (!supabase) return { error: 'Database not configured' }
  const ext = file.name.split('.').pop() || 'bin'
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('portfolio-media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })
  if (error) {
    console.warn('CMS upload media:', error)
    return { error: error.message }
  }
  const { data } = supabase.storage.from('portfolio-media').getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

/** Admin: create archive post with media. New post gets order = max(order) + 1 and visible = true so it appears at the end. */
export async function createArchivePost(
  params: {
    title: string
    description: string
    tags?: string[]
    categories?: string[]
    cover_src: string
  },
  media: { type: 'image' | 'video'; src: string; alt?: string; objectFit?: string; objectPosition?: string }[]
): Promise<{ id?: string; error: string | null }> {
  if (!supabase) return { error: 'Database not configured' }
  const { data: maxRow } = await supabase
    .from('archive_posts')
    .select('order')
    .order('order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = maxRow?.order != null ? maxRow.order + 1 : 0
  const { data: post, error: postError } = await supabase
    .from('archive_posts')
    .insert({
      title: params.title.trim(),
      description: params.description.trim() || '',
      tags: params.tags ?? [],
      categories: params.categories ?? [],
      cover_src: params.cover_src,
      visible: true,
      order: nextOrder,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (postError || !post) {
    console.warn('CMS create archive post:', postError)
    return { error: postError?.message ?? 'Failed to create post' }
  }
  const postId = (post as { id: string }).id
  if (media.length) {
    const rows = media.map((m, i) => ({
      archive_id: postId,
      order: i,
      type: m.type,
      src: m.src,
      alt: m.alt ?? null,
      object_fit: m.objectFit ?? null,
      object_position: m.objectPosition ?? null,
    }))
    const { error: mediaError } = await supabase.from('archive_media').insert(rows)
    if (mediaError) {
      console.warn('CMS create archive media:', mediaError)
      return { id: postId, error: mediaError.message }
    }
  }
  return { id: postId, error: null }
}

export async function fetchArchiveProjects(): Promise<ArchiveProject[]> {
  if (!supabase) return staticArchiveNormalized
  const { data: posts, error } = await supabase
    .from('archive_posts')
    .select('*')
    .order('order', { ascending: true })
  if (error) {
    console.warn('CMS fetch archive:', error)
    return staticArchiveNormalized
  }
  if (!posts?.length) return staticArchiveNormalized
  const ids = (posts as ArchivePostRow[]).map((p) => p.id)
  const { data: mediaRows } = await supabase
    .from('archive_media')
    .select('*')
    .in('archive_id', ids)
  const media = (mediaRows ?? []) as ArchiveMediaRow[]
  return (posts as ArchivePostRow[]).map((p) =>
    archiveRowsToArchivePost(p, media.filter((m) => m.archive_id === p.id))
  ) as ArchiveProject[]
}

/** Admin: fetch a single archive post by id (for edit page). Returns null if not found. */
export async function fetchArchivePostById(id: string): Promise<ArchiveProject | null> {
  if (!supabase) return null
  const { data: post, error: postError } = await supabase
    .from('archive_posts')
    .select('*')
    .eq('id', id)
    .single()
  if (postError || !post) return null
  const { data: mediaRows } = await supabase
    .from('archive_media')
    .select('*')
    .eq('archive_id', id)
    .order('order', { ascending: true })
  const media = (mediaRows ?? []) as ArchiveMediaRow[]
  return archiveRowsToArchivePost(post as ArchivePostRow, media)
}

/** Admin: update archive post by id. */
export async function updateArchivePost(
  id: string,
  patch: {
    title?: string
    description?: string
    tags?: string[]
    categories?: string[]
    cover_src?: string
    visible?: boolean
    order?: number
  }
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Database not configured' }
  const { error } = await supabase
    .from('archive_posts')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) {
    console.warn('CMS update archive post:', error)
    return { error: error.message }
  }
  return { error: null }
}

/** Admin: replace all media for an archive post (deletes existing, inserts new list). */
export async function replaceArchivePostMedia(
  id: string,
  media: { type: 'image' | 'video'; src: string; alt?: string; objectFit?: string; objectPosition?: string }[]
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Database not configured' }
  const { error: delError } = await supabase.from('archive_media').delete().eq('archive_id', id)
  if (delError) {
    console.warn('CMS delete archive media:', delError)
    return { error: delError.message }
  }
  if (media.length === 0) return { error: null }
  const rows = media.map((m, i) => ({
    archive_id: id,
    order: i,
    type: m.type,
    src: m.src,
    alt: m.alt ?? null,
    object_fit: m.objectFit ?? null,
    object_position: m.objectPosition ?? null,
  }))
  const { error: insertError } = await supabase.from('archive_media').insert(rows)
  if (insertError) {
    console.warn('CMS insert archive media:', insertError)
    return { error: insertError.message }
  }
  return { error: null }
}

/** Admin: delete archive post by id (cascades to archive_media). */
export async function deleteArchivePost(id: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Database not configured' }
  const { error } = await supabase.from('archive_posts').delete().eq('id', id)
  if (error) {
    console.warn('CMS delete archive post:', error)
    return { error: error.message }
  }
  return { error: null }
}
