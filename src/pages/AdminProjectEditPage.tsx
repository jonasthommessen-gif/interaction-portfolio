import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createProjectSection,
  deleteProjectSection,
  fetchProjectRowBySlug,
  fetchProjectSections,
  normalizeOptionalHex,
  updateProject,
  updateProjectSection,
} from '../lib/cms'
import { applyBoldMarkdownToSelection, isBoldShortcut } from '../lib/textareaBoldMarkdown'
import { participantsForEdit } from '../lib/sectionParticipants'
import type {
  InteractiveId,
  ProjectRow,
  ProjectSectionRow,
  SectionDisplayOptions,
  SectionSideInfo,
  SectionSideInfoAward,
  SectionSideInfoParticipant,
} from '../types/cms'
import type { SectionContent, SectionLayoutKey, SectionSubBlock, SectionSubBlockLayoutKey } from '../types/cms'
import { SECTION_LAYOUTS, SECTION_SUBBLOCK_LAYOUTS } from '../types/cms'
import { INTERACTIVE_IDS, INTERACTIVE_REGISTRY } from '../interactives/registry'
import { SectionGalleryUpload } from '../components/SectionGalleryUpload'
import { SectionMediaUpload } from '../components/SectionMediaUpload'
import styles from './AdminProjectEditPage.module.css'

const LAYOUTS_WITH_SINGLE_MEDIA: SectionLayoutKey[] = [
  'text-left-media-right',
  'media-left-text-right',
  'media-above-text',
  'media-wide-above-text',
  'full-bleed-media',
  'full-bleed-media-natural',
  // Horizontal pan layouts (single wide image)
  'media-scroll-x',
  'text-left-scroll-media-right',
  'scroll-media-left-text-right',
]

const LAYOUTS_WITH_GALLERY: SectionLayoutKey[] = [
  'gallery-strip',
  // Carousel layouts (multiple images)
  'media-carousel',
  'text-left-carousel-right',
  'carousel-left-text-right',
]

const ICON_SIZE = 16

function IconChevronUp() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

const SECTION_LAYOUT_LABELS: Record<SectionLayoutKey, string> = {
  'text-only': 'Text only',
  'text-left-media-right': 'Text left, media right',
  'media-left-text-right': 'Media left, text right',
  'full-bleed-media': 'Full-bleed media (hero) + caption',
  'full-bleed-media-natural': 'Full-bleed media (natural height, uncropped) + caption',
  'media-above-text': 'Media above text (hero height)',
  'media-wide-above-text': 'Media above text (wide, natural height)',
  'gallery-strip': 'Gallery strip',
  'project-overview': 'Project overview (facts)',
  'media-scroll-x': 'Wide image — full width, pan horizontally',
  'text-left-scroll-media-right': 'Text left, wide image right (pan)',
  'scroll-media-left-text-right': 'Wide image left (pan), text right',
  'media-carousel': 'Carousel — full width',
  'text-left-carousel-right': 'Text left, carousel right',
  'carousel-left-text-right': 'Carousel left, text right',
  interactive: 'Interactive component',
}

function hasTrimmedText(s: string | undefined) {
  return Boolean(s?.trim())
}

export function AdminProjectEditPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [row, setRow] = useState<ProjectRow | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [slugValue, setSlugValue] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState('')
  const [visible, setVisible] = useState(true)
  const [order, setOrder] = useState(0)
  const [sections, setSections] = useState<ProjectSectionRow[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [addSectionLabel, setAddSectionLabel] = useState('')
  const [addSectionLayout, setAddSectionLayout] = useState<ProjectSectionRow['layout']>('text-only')
  const [addingSection, setAddingSection] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editSectionLabel, setEditSectionLabel] = useState('')
  const [sectionError, setSectionError] = useState<string | null>(null)
  const [stage, setStage] = useState<'structure' | 'content'>('structure')
  const [savingContentSectionId, setSavingContentSectionId] = useState<string | null>(null)
  const [savingLayoutSectionId, setSavingLayoutSectionId] = useState<string | null>(null)
  const [reorderingSectionId, setReorderingSectionId] = useState<string | null>(null)
  const [contentSectionError, setContentSectionError] = useState<string | null>(null)
  const [coverType, setCoverType] = useState<'image' | 'video'>('image')
  const [coverSrc, setCoverSrc] = useState('')
  const [coverPoster, setCoverPoster] = useState<string | null>(null)
  const [coverAlt, setCoverAlt] = useState('')
  const [coverObjectPosition, setCoverObjectPosition] = useState('50% 50%')
  const [coverObjectScale, setCoverObjectScale] = useState(1)
  const [coverObjectRotation, setCoverObjectRotation] = useState(0)
  const [cardTitleHex, setCardTitleHex] = useState('')
  const [cardPillHex, setCardPillHex] = useState('')

  const loadSections = useCallback((projectId: string) => {
    setSectionsLoading(true)
    fetchProjectSections(projectId)
      .then(async (rows) => {
        // Heal duplicate / gap order values left by the old swap-based reorder.
        // Sorted by order then id so the intended sequence is preserved and
        // tie-breaking is deterministic.
        const sorted = [...rows].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        const needsFix = sorted.some((s, i) => s.order !== i)
        if (needsFix) {
          const healed = sorted.map((s, i) => ({ ...s, order: i }))
          setSections(healed)
          // Await so we know if the heal succeeded — fire-and-forget hid failures.
          await Promise.all(
            healed
              .filter((s, i) => rows.find((r) => r.id === s.id)!.order !== i)
              .map((s) => updateProjectSection(s.id, { order: s.order })),
          )
        } else {
          setSections(rows)
        }
      })
      .finally(() => setSectionsLoading(false))
  }, [])

  useEffect(() => {
    if (!slug) {
      setRow(undefined)
      return
    }
    setRow(null)
    fetchProjectRowBySlug(slug)
      .then((data) => {
        setRow(data ?? undefined)
        if (data) {
          setTitle(data.title)
          setSlugValue(data.slug)
          setDescription(data.description ?? '')
          setCategories(Array.isArray(data.categories) ? data.categories.join(', ') : '')
          setVisible(data.visible)
          setOrder(data.order)
          setCoverType(data.cover_type)
          setCoverSrc(data.cover_src ?? '')
          setCoverPoster(data.cover_poster ?? null)
          setCoverAlt(data.cover_alt ?? '')
          setCoverObjectPosition(data.cover_object_position ?? '50% 50%')
          setCoverObjectScale(data.cover_object_scale != null && data.cover_object_scale > 0 ? data.cover_object_scale : 1)
          setCoverObjectRotation(data.cover_object_rotation ?? 0)
          setCardTitleHex(normalizeOptionalHex(data.card_title_color) ?? '')
          setCardPillHex(normalizeOptionalHex(data.card_pill_background) ?? '')
          loadSections(data.id)
        }
      })
      .catch(() => setRow(undefined))
  }, [slug, loadSections])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!row?.id) return
    setSaving(true)
    setSaveError(null)
    const categoryList = categories
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)

    const titleTrim = cardTitleHex.trim()
    const pillTrim = cardPillHex.trim()
    const titleNorm = titleTrim ? normalizeOptionalHex(titleTrim) : null
    const pillNorm = pillTrim ? normalizeOptionalHex(pillTrim) : null
    if (titleTrim && titleNorm === undefined) {
      setSaveError('Card title color: use a valid hex like #1a1a1a or #rgb.')
      setSaving(false)
      return
    }
    if (pillTrim && pillNorm === undefined) {
      setSaveError('Pill background: use a valid hex like #2d5016 or #rgb.')
      setSaving(false)
      return
    }

    const { error } = await updateProject(row.id, {
      title: title.trim() || undefined,
      slug: slugValue.trim() || undefined,
      description: description.trim() || null,
      categories: categoryList.length ? categoryList : undefined,
      visible,
      order: Number.isFinite(Number(order)) ? Number(order) : undefined,
      cover_type: coverType,
      cover_src: coverSrc || undefined,
      cover_poster: coverPoster,
      cover_alt: coverAlt || undefined,
      cover_object_position: coverObjectPosition === '50% 50%' ? null : coverObjectPosition,
      cover_object_scale: coverObjectScale !== 1 ? coverObjectScale : null,
      cover_object_rotation: coverObjectRotation !== 0 ? coverObjectRotation : null,
      card_title_color: titleNorm ?? null,
      card_pill_background: pillNorm ?? null,
    })
    setSaving(false)
    if (error) {
      setSaveError(error)
      return
    }
    navigate('/admin/projects')
  }

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!row?.id || !addSectionLabel.trim()) return
    setSectionError(null)
    setAddingSection(true)
    const { error } = await createProjectSection(row.id, {
      label: addSectionLabel.trim(),
      layout: addSectionLayout,
      order: sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 1 : 0,
      content: { body: '' },
    })
    setAddingSection(false)
    if (error) {
      const hint =
        /check constraint|violates check/i.test(error) && addSectionLayout === 'project-overview'
          ? `${error} Run migration 011 (project_sections layout check) on your Supabase project, e.g. paste supabase/migrations/011_project_section_overview_layout.sql into the SQL editor.`
          : error
      setSectionError(hint)
      return
    }
    setAddSectionLabel('')
    loadSections(row.id)
  }

  const startEditSection = (s: ProjectSectionRow) => {
    setEditingSectionId(s.id)
    setEditSectionLabel(s.label)
    setSectionError(null)
  }

  const handleSaveSectionLabel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSectionId) return
    setSectionError(null)
    const { error } = await updateProjectSection(editingSectionId, {
      label: editSectionLabel.trim(),
    })
    if (error) {
      setSectionError(error)
      return
    }
    setEditingSectionId(null)
    if (row?.id) loadSections(row.id)
  }

  const updateSectionContent = useCallback((sectionId: string, patch: Partial<SectionContent>) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, content: { ...s.content, ...patch } } : s
      )
    )
  }, [])

  const patchSectionDisplay = useCallback((sectionId: string, displayPatch: Partial<SectionDisplayOptions>) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s
        return {
          ...s,
          content: {
            ...s.content,
            display: { ...s.content.display, ...displayPatch },
          },
        }
      })
    )
  }, [])

  const patchSectionSideInfo = useCallback((sectionId: string, patch: Partial<SectionSideInfo>) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s
        const cur = s.content.sideInfo ?? {}
        return {
          ...s,
          content: {
            ...s.content,
            sideInfo: { ...cur, ...patch },
          },
        }
      }),
    )
  }, [])

  const handleSectionLayoutChange = async (sectionId: string, layout: SectionLayoutKey) => {
    if (!row?.id) return
    const prev = sections.find((s) => s.id === sectionId)
    if (!prev || prev.layout === layout) return
    setSections((p) => p.map((s) => (s.id === sectionId ? { ...s, layout } : s)))
    setSectionError(null)
    setSavingLayoutSectionId(sectionId)
    const { error } = await updateProjectSection(sectionId, { layout })
    setSavingLayoutSectionId(null)
    if (error) {
      const hint =
        /check constraint|violates check/i.test(error) && layout === 'project-overview'
          ? `${error} Run migration 011 (project_sections layout check) on your Supabase project, e.g. paste supabase/migrations/011_project_section_overview_layout.sql into the SQL editor.`
          : error
      setSectionError(hint)
      loadSections(row.id)
    }
  }

  const handleSaveSectionContent = async (sectionId: string) => {
    const section = sections.find((s) => s.id === sectionId)
    if (!section) return
    setContentSectionError(null)
    setSavingContentSectionId(sectionId)
    const { error } = await updateProjectSection(sectionId, {
      content: section.content,
    })
    setSavingContentSectionId(null)
    if (error) {
      setContentSectionError(error)
      return
    }
    if (row?.id) loadSections(row.id)
  }

  const handleDeleteSection = async (id: string) => {
    if (!confirm('Delete this section?')) return
    const { error } = await deleteProjectSection(id)
    if (error) setSectionError(error)
    else if (row?.id) loadSections(row.id)
  }

  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    if (!row?.id) return
    const sorted = [...sections].sort((a, b) => a.order - b.order)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= sorted.length) return

    // Build a new ordering by moving the item and assigning sequential orders 0,1,2…
    const reordered = [...sorted]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved!)
    const reassigned = reordered.map((s, newIdx) => ({ ...s, order: newIdx }))

    setSectionError(null)
    setReorderingSectionId(moved!.id)

    // Optimistic update — show new order immediately before the DB round-trip
    setSections((prev) =>
      prev.map((s) => {
        const updated = reassigned.find((r) => r.id === s.id)
        return updated ? { ...s, order: updated.order } : s
      }),
    )

    // Snapshot of pre-optimistic orders for the diff (sections is already stale here)
    const snapshot = sections
    try {
      const changed = reassigned.filter((r) => {
        const original = snapshot.find((s) => s.id === r.id)
        return original && original.order !== r.order
      })
      const results = await Promise.all(
        changed.map((s) => updateProjectSection(s.id, { order: s.order })),
      )
      const firstError = results.find((r) => r.error)
      if (firstError?.error) {
        setSectionError(firstError.error)
        loadSections(row.id)
      }
    } catch (err) {
      setSectionError(String(err))
      loadSections(row.id)
    } finally {
      setReorderingSectionId(null)
    }
  }

  if (row === undefined && slug) {
    return (
      <div className={styles.page}>
        <p className={styles.message}>Project not found or not editable (e.g. static content).</p>
        <Link to="/admin/projects" className={styles.back}>← Back to Projects</Link>
      </div>
    )
  }

  if (row === null) {
    return (
      <div className={styles.page}>
        <p className={styles.message}>Loading…</p>
      </div>
    )
  }

  const hasSections = sections.length > 0
  const sortedSections = [...sections].sort((a, b) => a.order - b.order)
  const uploadFolder = row?.id ? `projects/${row.id}` : 'projects'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Edit project</h2>
        <Link to="/admin/projects" className={styles.back}>← Back to Projects</Link>
      </div>

      <div className={styles.stageTabs} role="tablist" aria-label="Edit stages">
        <button
          type="button"
          role="tab"
          aria-selected={stage === 'structure'}
          aria-controls="stage-structure"
          id="tab-structure"
          className={styles.stageTab}
          onClick={() => setStage('structure')}
        >
          Project & sections
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={stage === 'content'}
          aria-controls="stage-content"
          id="tab-content"
          className={styles.stageTab}
          onClick={() => setStage('content')}
          disabled={!hasSections}
        >
          Section content
        </button>
      </div>

      <div
        id="stage-structure"
        role="tabpanel"
        aria-labelledby="tab-structure"
        aria-hidden={stage !== 'structure'}
        className={styles.stagePanel}
      >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="edit-title" className={styles.label}>Title</label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="edit-slug" className={styles.label}>Slug</label>
          <input
            id="edit-slug"
            type="text"
            value={slugValue}
            onChange={(e) => setSlugValue(e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="edit-description" className={styles.label}>Description</label>
          <textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
            rows={3}
            placeholder="Short description shown under the title on the project page"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="edit-categories" className={styles.label}>Categories</label>
          <input
            id="edit-categories"
            type="text"
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            className={styles.input}
            placeholder="Motion, UI, Prototype (comma-separated)"
          />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="edit-visible" className={styles.label}>Visible on site</label>
            <input
              id="edit-visible"
              type="checkbox"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
              className={styles.checkbox}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="edit-order" className={styles.label}>Order</label>
            <input
              id="edit-order"
              type="number"
              min={0}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className={styles.input}
            />
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Projects page — card title color</span>
          <p className={styles.cardPictureHint}>
            Optional. Use when the cover is light so white text disappears. Leave empty for automatic.
          </p>
          <div className={styles.colorPickRow}>
            <input
              type="color"
              className={styles.colorPick}
              aria-label="Pick title color"
              value={normalizeOptionalHex(cardTitleHex) ?? '#ffffff'}
              onChange={(e) => setCardTitleHex(e.target.value)}
            />
            <input
              type="text"
              className={styles.input}
              style={{ flex: '1 1 10rem', minWidth: '7rem' }}
              value={cardTitleHex}
              onChange={(e) => setCardTitleHex(e.target.value)}
              placeholder="#1a1a1a"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className={styles.submit}
              style={{ flex: '0 0 auto' }}
              onClick={() => setCardTitleHex('')}
            >
              Clear
            </button>
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>Projects page — category pill background</span>
          <p className={styles.cardPictureHint}>
            Optional. Overrides colors sampled from the cover image. Pill label text picks light/dark automatically.
          </p>
          <div className={styles.colorPickRow}>
            <input
              type="color"
              className={styles.colorPick}
              aria-label="Pick pill background"
              value={normalizeOptionalHex(cardPillHex) ?? '#ffffff'}
              onChange={(e) => setCardPillHex(e.target.value)}
            />
            <input
              type="text"
              className={styles.input}
              style={{ flex: '1 1 10rem', minWidth: '7rem' }}
              value={cardPillHex}
              onChange={(e) => setCardPillHex(e.target.value)}
              placeholder="#2d5016"
              spellCheck={false}
              autoComplete="off"
            />
            <button
              type="button"
              className={styles.submit}
              style={{ flex: '0 0 auto' }}
              onClick={() => setCardPillHex('')}
            >
              Clear
            </button>
          </div>
        </div>
        {saveError && <p className={styles.error}>{saveError}</p>}
        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>

      <section className={styles.cardPictureBlock} aria-labelledby="card-picture-heading">
        <h3 id="card-picture-heading" className={styles.sectionsHeading}>Project card picture</h3>
        <p className={styles.cardPictureHint}>Image or video shown on the project card on the projects page.</p>
        <SectionMediaUpload
          value={coverSrc ? { type: coverType, src: coverSrc, alt: coverAlt, poster: coverType === 'video' ? (coverPoster ?? undefined) : undefined, objectPosition: coverObjectPosition, objectScale: coverObjectScale, objectRotation: coverObjectRotation } : undefined}
          onChange={(media) => {
            if (!media) {
              setCoverSrc('')
              setCoverAlt('')
              setCoverPoster(null)
              setCoverObjectScale(1)
              setCoverObjectRotation(0)
            } else {
              setCoverType(media.type)
              setCoverSrc(media.src)
              setCoverAlt(media.alt ?? '')
              setCoverPoster(media.poster ?? null)
              setCoverObjectPosition(media.objectPosition ?? '50% 50%')
              setCoverObjectScale(media.objectScale ?? 1)
              setCoverObjectRotation(media.objectRotation ?? 0)
            }
          }}
          uploadFolder={row?.id ? `projects/${row.id}` : 'projects'}
          cropAspectRatio="1772/1080"
          cropFrameLabel="Project card on the site"
          cropEnableZoom
          cropEnableRotation
        />
      </section>

      <section className={styles.sectionsBlock} aria-labelledby="sections-heading">
        <h3 id="sections-heading" className={styles.sectionsHeading}>Sections</h3>
        {sectionError && <p className={styles.error}>{sectionError}</p>}
        {sectionsLoading && <p className={styles.message}>Loading sections…</p>}
        <ul className={styles.sectionList}>
          {sortedSections.map((s, index) => (
            <li key={s.id} className={styles.sectionItem}>
              {editingSectionId === s.id ? (
                <form onSubmit={handleSaveSectionLabel} className={styles.sectionEditForm}>
                  <div className={styles.field}>
                    <label className={styles.label}>Section name</label>
                    <input
                      type="text"
                      value={editSectionLabel}
                      onChange={(e) => setEditSectionLabel(e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>
                  <div className={styles.sectionEditActions}>
                    <button type="submit" className={styles.submit}>Save</button>
                    <button type="button" className={styles.cancelBtn} onClick={() => setEditingSectionId(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className={styles.sectionReorder}>
                    <button
                      type="button"
                      className={styles.sectionReorderBtn}
                      onClick={() => handleMoveSection(index, 'up')}
                      disabled={index === 0 || reorderingSectionId !== null}
                      aria-label={`Move ${s.label} up`}
                      title="Move up"
                    >
                      <IconChevronUp />
                    </button>
                    <button
                      type="button"
                      className={styles.sectionReorderBtn}
                      onClick={() => handleMoveSection(index, 'down')}
                      disabled={index === sortedSections.length - 1 || reorderingSectionId !== null}
                      aria-label={`Move ${s.label} down`}
                      title="Move down"
                    >
                      <IconChevronDown />
                    </button>
                  </div>
                  <span className={styles.sectionLabel}>{s.label}</span>
                  <label className={styles.sectionLayoutField}>
                    <span className={styles.visuallyHidden}>Layout</span>
                    <select
                      className={styles.sectionLayoutSelect}
                      value={s.layout}
                      disabled={savingLayoutSectionId === s.id}
                      aria-busy={savingLayoutSectionId === s.id}
                      onChange={(e) => handleSectionLayoutChange(s.id, e.target.value as SectionLayoutKey)}
                    >
                      {SECTION_LAYOUTS.map((l) => (
                        <option key={l} value={l}>
                          {SECTION_LAYOUT_LABELS[l]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className={styles.sectionBtn} onClick={() => setStage('content')}>
                    Edit content
                  </button>
                  <button type="button" className={styles.sectionBtn} onClick={() => startEditSection(s)}>
                    Edit name
                  </button>
                  <button type="button" className={styles.sectionBtnDanger} onClick={() => handleDeleteSection(s.id)}>
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddSection} className={styles.addSectionForm}>
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="add-section-label" className={styles.label}>New section name</label>
              <input
                id="add-section-label"
                type="text"
                value={addSectionLabel}
                onChange={(e) => setAddSectionLabel(e.target.value)}
                className={styles.input}
                placeholder="e.g. Overview"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="add-section-layout" className={styles.label}>Layout</label>
              <select
                id="add-section-layout"
                value={addSectionLayout}
                onChange={(e) => setAddSectionLayout(e.target.value as ProjectSectionRow['layout'])}
                className={styles.input}
              >
                {SECTION_LAYOUTS.map((l) => (
                  <option key={l} value={l}>
                    {SECTION_LAYOUT_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className={styles.submit} disabled={addingSection}>
            {addingSection ? 'Adding…' : 'Add section'}
          </button>
        </form>
      </section>
      </div>

      <div
        id="stage-content"
        role="tabpanel"
        aria-labelledby="tab-content"
        aria-hidden={stage !== 'content'}
        className={styles.stagePanel}
      >
        {hasSections && (
          <>
            <p className={styles.contentStageIntro}>
              Fill in the text and media for each section. The fields below match each section’s layout preset.
            </p>
            {sectionError && <p className={styles.error}>{sectionError}</p>}
            {contentSectionError && <p className={styles.error}>{contentSectionError}</p>}
            {sortedSections.map((s) => (
              <div key={s.id} className={styles.contentSectionCard} id={`content-section-${s.id}`}>
                <div className={styles.contentSectionHeader}>
                  <h4 className={styles.contentSectionTitle}>{s.label}</h4>
                  <label className={styles.contentLayoutField}>
                    <span className={styles.contentLayoutLabel}>Layout</span>
                    <select
                      className={styles.contentLayoutSelect}
                      value={s.layout}
                      disabled={savingLayoutSectionId === s.id}
                      aria-busy={savingLayoutSectionId === s.id}
                      onChange={(e) => handleSectionLayoutChange(s.id, e.target.value as SectionLayoutKey)}
                    >
                      {SECTION_LAYOUTS.map((l) => (
                        <option key={l} value={l}>
                          {SECTION_LAYOUT_LABELS[l]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {row?.slug && (
                    <Link
                      to={`/projects/${row.slug}#section-${s.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.editContentBtn}
                    >
                      Preview
                    </Link>
                  )}
                </div>
                <div className={styles.contentSectionForm}>
                  {s.layout !== 'project-overview' ? (
                    <>
                      <div className={styles.field}>
                        <label className={styles.label}>Heading (optional)</label>
                        <input
                          type="text"
                          value={s.content?.heading ?? ''}
                          onChange={(e) => updateSectionContent(s.id, { heading: e.target.value || undefined })}
                          className={styles.input}
                          placeholder="Section heading"
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Body text</label>
                        <textarea
                          value={s.content?.body ?? ''}
                          onChange={(e) => updateSectionContent(s.id, { body: e.target.value || undefined })}
                          onKeyDown={(e) => {
                            if (!isBoldShortcut(e)) return
                            const cur = s.content?.body ?? ''
                            const ta = e.currentTarget
                            const res = applyBoldMarkdownToSelection(cur, ta.selectionStart, ta.selectionEnd)
                            if (!res) return
                            e.preventDefault()
                            flushSync(() => {
                              updateSectionContent(s.id, { body: res.value || undefined })
                            })
                            ta.setSelectionRange(res.start, res.end)
                          }}
                          className={styles.textarea}
                          rows={4}
                          placeholder="Section body content"
                        />
                        <p className={styles.displayHint}>
                          Use a blank line between paragraphs. Single line breaks stay as line breaks. Select text and
                          press <strong>⌘B</strong> (Mac) or <strong>Ctrl+B</strong> (Windows) to bold, or wrap words in{' '}
                          <strong>**double asterisks**</strong>.
                        </p>
                      </div>
                      {LAYOUTS_WITH_SINGLE_MEDIA.includes(s.layout) && (
                        <>
                          <SectionMediaUpload
                            value={s.content?.media}
                            onChange={(media) => updateSectionContent(s.id, { media })}
                            uploadFolder={uploadFolder}
                          />
                          <SectionMediaUpload
                            label="Mobile media (optional)"
                            description="Portrait or vertical (e.g. 9:16). Shown on narrow screens instead of main media when set. Desktop always uses main media above."
                            value={s.content?.mediaMobile}
                            onChange={(mediaMobile) => updateSectionContent(s.id, { mediaMobile })}
                            uploadFolder={uploadFolder}
                            cropAspectRatio="9/16"
                            cropFrameLabel="Phone viewport"
                          />
                        </>
                      )}
                      {LAYOUTS_WITH_GALLERY.includes(s.layout) && (
                        <SectionGalleryUpload
                          value={s.content?.gallery}
                          onChange={(gallery) => updateSectionContent(s.id, { gallery })}
                          uploadFolder={uploadFolder}
                        />
                      )}
                      {s.layout === 'interactive' && (
                        <div className={styles.field}>
                          <label className={styles.label} htmlFor={`interactive-${s.id}`}>
                            Interactive
                          </label>
                          <select
                            id={`interactive-${s.id}`}
                            className={styles.input}
                            value={s.content?.interactive?.id ?? ''}
                            onChange={(e) => {
                              const id = e.target.value as InteractiveId
                              if (!(INTERACTIVE_IDS as readonly string[]).includes(id)) {
                                updateSectionContent(s.id, { interactive: undefined })
                                return
                              }
                              updateSectionContent(s.id, {
                                interactive: {
                                  id,
                                  initialKw: s.content?.interactive?.initialKw,
                                },
                              })
                            }}
                          >
                            <option value="">Select…</option>
                            {INTERACTIVE_IDS.map((id) => (
                              <option key={id} value={id}>
                                {INTERACTIVE_REGISTRY[id].label}
                              </option>
                            ))}
                          </select>
                          {s.content?.interactive?.id === 'charging-speed-card' && (
                            <>
                              <label className={styles.label} htmlFor={`interactive-kw-${s.id}`} style={{ marginTop: '0.75rem' }}>
                                Starting kW (optional)
                              </label>
                              <input
                                id={`interactive-kw-${s.id}`}
                                type="number"
                                className={styles.input}
                                min={0}
                                max={400}
                                value={s.content.interactive.initialKw ?? 120}
                                onChange={(e) => {
                                  const n = Number(e.target.value)
                                  updateSectionContent(s.id, {
                                    interactive: {
                                      id: 'charging-speed-card',
                                      initialKw: Number.isFinite(n) ? n : 120,
                                    },
                                  })
                                }}
                              />
                            </>
                          )}
                        </div>
                      )}
                      <div className={styles.subsectionsBlock}>
                        <div className={styles.sideInfoListHeader}>
                          <span className={styles.label}>Additional blocks</span>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => {
                              const subsections = [...(s.content?.subsections ?? []), {}]
                              updateSectionContent(s.id, { subsections })
                            }}
                          >
                            Add block
                          </button>
                        </div>
                        <p className={styles.displayHint}>
                          Optional extra strips below the main fields. Each block can use the section layout or pick its
                          own for media placement. Does not add sidebar items or new anchors.
                        </p>
                        {(s.content?.subsections ?? []).map((sub, i) => {
                          const rowLayout: SectionLayoutKey = sub.layout ?? s.layout
                          return (
                          <div key={`subsection-${s.id}-${i}`} className={styles.subsectionCard}>
                            <div className={styles.subsectionCardHeader}>
                              <span className={styles.subsectionCardTitle}>Block {i + 1}</span>
                              <div className={styles.subsectionCardActions}>
                                <button
                                  type="button"
                                  className={styles.textButton}
                                  disabled={i === 0}
                                  onClick={() => {
                                    const subsections = [...(s.content?.subsections ?? [])]
                                    const prev = subsections[i - 1]!
                                    subsections[i - 1] = subsections[i]!
                                    subsections[i] = prev
                                    updateSectionContent(s.id, { subsections })
                                  }}
                                >
                                  Move up
                                </button>
                                <button
                                  type="button"
                                  className={styles.textButton}
                                  disabled={i === (s.content?.subsections?.length ?? 0) - 1}
                                  onClick={() => {
                                    const subsections = [...(s.content?.subsections ?? [])]
                                    const next = subsections[i + 1]!
                                    subsections[i + 1] = subsections[i]!
                                    subsections[i] = next
                                    updateSectionContent(s.id, { subsections })
                                  }}
                                >
                                  Move down
                                </button>
                                <button
                                  type="button"
                                  className={styles.textButton}
                                  onClick={() => {
                                    const subsections = (s.content?.subsections ?? []).filter((_, j) => j !== i)
                                    updateSectionContent(s.id, {
                                      subsections: subsections.length ? subsections : undefined,
                                    })
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label} htmlFor={`subsection-layout-${s.id}-${i}`}>
                                Layout for this block
                              </label>
                              <select
                                id={`subsection-layout-${s.id}-${i}`}
                                className={styles.contentLayoutSelect}
                                value={sub.layout ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value
                                  const subsections: SectionSubBlock[] = [...(s.content?.subsections ?? [])]
                                  subsections[i] = {
                                    ...subsections[i],
                                    layout: v ? (v as SectionSubBlockLayoutKey) : undefined,
                                  }
                                  updateSectionContent(s.id, { subsections })
                                }}
                              >
                                <option value="">
                                  Same as section ({SECTION_LAYOUT_LABELS[s.layout]})
                                </option>
                                {SECTION_SUBBLOCK_LAYOUTS.map((l) => (
                                  <option key={l} value={l}>
                                    {SECTION_LAYOUT_LABELS[l]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>Heading (optional)</label>
                              <input
                                type="text"
                                className={styles.input}
                                placeholder="Block heading"
                                value={sub.heading ?? ''}
                                onChange={(e) => {
                                  const subsections: SectionSubBlock[] = [...(s.content?.subsections ?? [])]
                                  subsections[i] = {
                                    ...subsections[i],
                                    heading: e.target.value.trim() ? e.target.value : undefined,
                                  }
                                  updateSectionContent(s.id, { subsections })
                                }}
                              />
                            </div>
                            <div className={styles.field}>
                              <label className={styles.label}>Body text</label>
                              <textarea
                                className={styles.textarea}
                                rows={4}
                                placeholder="Block body"
                                value={sub.body ?? ''}
                                onChange={(e) => {
                                  const subsections: SectionSubBlock[] = [...(s.content?.subsections ?? [])]
                                  subsections[i] = {
                                    ...subsections[i],
                                    body: e.target.value.trim() ? e.target.value : undefined,
                                  }
                                  updateSectionContent(s.id, { subsections })
                                }}
                                onKeyDown={(e) => {
                                  if (!isBoldShortcut(e)) return
                                  const cur = sub.body ?? ''
                                  const ta = e.currentTarget
                                  const res = applyBoldMarkdownToSelection(cur, ta.selectionStart, ta.selectionEnd)
                                  if (!res) return
                                  e.preventDefault()
                                  const body = res.value.trim() ? res.value : undefined
                                  flushSync(() => {
                                    const subsections: SectionSubBlock[] = [...(s.content?.subsections ?? [])]
                                    subsections[i] = { ...subsections[i], body }
                                    updateSectionContent(s.id, { subsections })
                                  })
                                  if (body !== undefined) {
                                    ta.setSelectionRange(res.start, res.end)
                                  } else {
                                    ta.setSelectionRange(0, 0)
                                  }
                                }}
                              />
                              <p className={styles.displayHint}>
                                Blank lines = paragraphs; <strong>**bold**</strong> or <strong>⌘B</strong> /{' '}
                                <strong>Ctrl+B</strong> on a selection.
                              </p>
                            </div>
                            {LAYOUTS_WITH_SINGLE_MEDIA.includes(rowLayout) && (
                              <>
                                <SectionMediaUpload
                                  value={sub.media}
                                  onChange={(media) => {
                                    const subsections: SectionSubBlock[] = [...(s.content?.subsections ?? [])]
                                    subsections[i] = { ...subsections[i], media }
                                    updateSectionContent(s.id, { subsections })
                                  }}
                                  uploadFolder={uploadFolder}
                                />
                                <SectionMediaUpload
                                  label="Mobile media (optional)"
                                  description="Portrait or vertical when set; same behavior as main block."
                                  value={sub.mediaMobile}
                                  onChange={(mediaMobile) => {
                                    const subsections: SectionSubBlock[] = [...(s.content?.subsections ?? [])]
                                    subsections[i] = { ...subsections[i], mediaMobile }
                                    updateSectionContent(s.id, { subsections })
                                  }}
                                  uploadFolder={uploadFolder}
                                  cropAspectRatio="9/16"
                                  cropFrameLabel="Phone viewport"
                                />
                              </>
                            )}
                            {LAYOUTS_WITH_GALLERY.includes(rowLayout as SectionLayoutKey) && (
                              <SectionGalleryUpload
                                value={sub.gallery}
                                onChange={(gallery) => {
                                  const subsections: SectionSubBlock[] = [...(s.content?.subsections ?? [])]
                                  subsections[i] = { ...subsections[i], gallery }
                                  updateSectionContent(s.id, { subsections })
                                }}
                                uploadFolder={uploadFolder}
                              />
                            )}
                            {rowLayout === 'interactive' && (
                              <div className={styles.field}>
                                <label className={styles.label} htmlFor={`interactive-sub-${s.id}-${i}`}>
                                  Interactive
                                </label>
                                <select
                                  id={`interactive-sub-${s.id}-${i}`}
                                  className={styles.input}
                                  value={sub.interactive?.id ?? ''}
                                  onChange={(e) => {
                                    const id = e.target.value as InteractiveId
                                    const subsections: SectionSubBlock[] = [...(s.content?.subsections ?? [])]
                                    if (!(INTERACTIVE_IDS as readonly string[]).includes(id)) {
                                      subsections[i] = { ...subsections[i], interactive: undefined }
                                    } else {
                                      subsections[i] = {
                                        ...subsections[i],
                                        interactive: {
                                          id,
                                          initialKw: subsections[i]?.interactive?.initialKw,
                                        },
                                      }
                                    }
                                    updateSectionContent(s.id, { subsections })
                                  }}
                                >
                                  <option value="">Select…</option>
                                  {INTERACTIVE_IDS.map((id) => (
                                    <option key={id} value={id}>
                                      {INTERACTIVE_REGISTRY[id].label}
                                    </option>
                                  ))}
                                </select>
                                {sub.interactive?.id === 'charging-speed-card' && (
                                  <>
                                    <label
                                      className={styles.label}
                                      htmlFor={`interactive-kw-sub-${s.id}-${i}`}
                                      style={{ marginTop: '0.75rem' }}
                                    >
                                      Starting kW (optional)
                                    </label>
                                    <input
                                      id={`interactive-kw-sub-${s.id}-${i}`}
                                      type="number"
                                      className={styles.input}
                                      min={0}
                                      max={400}
                                      value={sub.interactive.initialKw ?? 120}
                                      onChange={(e) => {
                                        const n = Number(e.target.value)
                                        const subsections: SectionSubBlock[] = [...(s.content?.subsections ?? [])]
                                        subsections[i] = {
                                          ...subsections[i],
                                          interactive: {
                                            id: 'charging-speed-card',
                                            initialKw: Number.isFinite(n) ? n : 120,
                                          },
                                        }
                                        updateSectionContent(s.id, { subsections })
                                      }}
                                    />
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          )
                        })}
                      </div>
                    </>
                  ) : null}
                  <div className={styles.field}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={s.content?.display?.showSectionTitle === true}
                        onChange={(e) =>
                          patchSectionDisplay(s.id, {
                            showSectionTitle: e.target.checked,
                            ...(!e.target.checked ? { sectionTitleAboveMedia: false } : {}),
                          })
                        }
                      />
                      Show section title on project page (next to content, not in sidebar)
                    </label>
                  </div>
                  {s.layout !== 'project-overview' ? (
                    <div className={styles.field}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={s.content?.display?.sectionTitleAboveMedia === true}
                          disabled={
                            !s.content?.display?.showSectionTitle ||
                            !(
                              (LAYOUTS_WITH_SINGLE_MEDIA.includes(s.layout) &&
                                Boolean(s.content?.media?.src || s.content?.mediaMobile?.src) &&
                                !hasTrimmedText(s.content?.body) &&
                                !hasTrimmedText(s.content?.heading)) ||
                              (LAYOUTS_WITH_GALLERY.includes(s.layout) &&
                                (s.content?.gallery?.length ?? 0) > 0 &&
                                !hasTrimmedText(s.content?.body) &&
                                !hasTrimmedText(s.content?.heading))
                            )
                          }
                          onChange={(e) =>
                            patchSectionDisplay(s.id, { sectionTitleAboveMedia: e.target.checked })
                          }
                        />
                        Place title above media (only when section is media-only and title is shown)
                      </label>
                      <p className={styles.displayHint}>
                        Sidebar section names are unchanged. “Media-only” means no body or optional heading text.
                      </p>
                    </div>
                  ) : null}
                  {s.layout === 'project-overview' ? (
                    <div className={styles.sideInfoBlock}>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor={`side-overview-${s.id}`}>
                          Overview (short)
                        </label>
                        <textarea
                          id={`side-overview-${s.id}`}
                          className={styles.textarea}
                          rows={3}
                          value={s.content?.sideInfo?.overview ?? ''}
                          onChange={(e) =>
                            patchSectionSideInfo(s.id, {
                              overview: e.target.value.trim() ? e.target.value : undefined,
                            })
                          }
                          placeholder="One short paragraph"
                        />
                      </div>
                      <div className={styles.row}>
                        <div className={styles.field} style={{ flex: '1 1 12rem' }}>
                          <label className={styles.label} htmlFor={`side-time-${s.id}`}>
                            Timeframe
                          </label>
                          <input
                            id={`side-time-${s.id}`}
                            className={styles.input}
                            value={s.content?.sideInfo?.timeframe ?? ''}
                            onChange={(e) =>
                              patchSectionSideInfo(s.id, {
                                timeframe: e.target.value.trim() ? e.target.value : undefined,
                              })
                            }
                            placeholder="e.g. Jan–Jun 2024"
                          />
                        </div>
                        <div className={styles.field} style={{ flex: '1 1 12rem' }}>
                          <label className={styles.label} htmlFor={`side-loc-${s.id}`}>
                            Location
                          </label>
                          <input
                            id={`side-loc-${s.id}`}
                            className={styles.input}
                            value={s.content?.sideInfo?.location ?? ''}
                            onChange={(e) =>
                              patchSectionSideInfo(s.id, {
                                location: e.target.value.trim() ? e.target.value : undefined,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor={`side-role-${s.id}`}>
                          Role
                        </label>
                        <input
                          id={`side-role-${s.id}`}
                          className={styles.input}
                          value={s.content?.sideInfo?.role ?? ''}
                          onChange={(e) =>
                            patchSectionSideInfo(s.id, {
                              role: e.target.value.trim() ? e.target.value : undefined,
                            })
                          }
                        />
                      </div>
                      <div className={styles.row}>
                        <div className={styles.field} style={{ flex: '1 1 12rem' }}>
                          <label className={styles.label} htmlFor={`side-tools-${s.id}`}>
                            Tools
                          </label>
                          <input
                            id={`side-tools-${s.id}`}
                            className={styles.input}
                            value={s.content?.sideInfo?.tools ?? ''}
                            onChange={(e) =>
                              patchSectionSideInfo(s.id, {
                                tools: e.target.value.trim() ? e.target.value : undefined,
                              })
                            }
                          />
                        </div>
                        <div className={styles.field} style={{ flex: '1 1 12rem' }}>
                          <label className={styles.label} htmlFor={`side-methods-${s.id}`}>
                            Methods
                          </label>
                          <input
                            id={`side-methods-${s.id}`}
                            className={styles.input}
                            value={s.content?.sideInfo?.methods ?? ''}
                            onChange={(e) =>
                              patchSectionSideInfo(s.id, {
                                methods: e.target.value.trim() ? e.target.value : undefined,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className={styles.field}>
                        <div className={styles.sideInfoListHeader}>
                          <span className={styles.label}>Participants</span>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => {
                              const participants: SectionSideInfoParticipant[] = [
                                ...participantsForEdit(s.content?.sideInfo?.participants),
                                { name: '' },
                              ]
                              patchSectionSideInfo(s.id, { participants })
                            }}
                          >
                            Add participant
                          </button>
                        </div>
                        <p className={styles.displayHint}>
                          Portfolio link is optional — leave the URL empty when someone has no site.
                        </p>
                        {participantsForEdit(s.content?.sideInfo?.participants).map((p, i) => (
                          <div key={`part-${s.id}-${i}`} className={styles.sideInfoRepeatRow}>
                            <input
                              className={styles.input}
                              aria-label={`Participant ${i + 1} name`}
                              placeholder="Name"
                              value={p.name}
                              onChange={(e) => {
                                const participants = [...participantsForEdit(s.content?.sideInfo?.participants)]
                                participants[i] = { ...participants[i], name: e.target.value }
                                patchSectionSideInfo(s.id, { participants })
                              }}
                            />
                            <input
                              className={styles.input}
                              aria-label={`Participant ${i + 1} portfolio URL`}
                              placeholder="Portfolio URL (optional)"
                              value={p.url ?? ''}
                              onChange={(e) => {
                                const participants = [...participantsForEdit(s.content?.sideInfo?.participants)]
                                participants[i] = {
                                  ...participants[i],
                                  url: e.target.value.trim() ? e.target.value : undefined,
                                }
                                patchSectionSideInfo(s.id, { participants })
                              }}
                            />
                            <button
                              type="button"
                              className={styles.textButton}
                              onClick={() => {
                                const participants = participantsForEdit(s.content?.sideInfo?.participants).filter(
                                  (_, j) => j !== i,
                                )
                                patchSectionSideInfo(s.id, {
                                  participants: participants.length ? participants : undefined,
                                })
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className={styles.field}>
                        <div className={styles.sideInfoListHeader}>
                          <span className={styles.label}>Links</span>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => {
                              const links = [...(s.content?.sideInfo?.links ?? []), { label: '', href: '' }]
                              patchSectionSideInfo(s.id, { links })
                            }}
                          >
                            Add link
                          </button>
                        </div>
                        {(s.content?.sideInfo?.links ?? []).map((link, i) => (
                          <div key={`link-${s.id}-${i}`} className={styles.sideInfoRepeatRow}>
                            <input
                              className={styles.input}
                              aria-label={`Link ${i + 1} label`}
                              placeholder="Label"
                              value={link.label}
                              onChange={(e) => {
                                const links = [...(s.content?.sideInfo?.links ?? [])]
                                links[i] = { ...links[i], label: e.target.value }
                                patchSectionSideInfo(s.id, { links })
                              }}
                            />
                            <input
                              className={styles.input}
                              aria-label={`Link ${i + 1} URL`}
                              placeholder="https://"
                              value={link.href}
                              onChange={(e) => {
                                const links = [...(s.content?.sideInfo?.links ?? [])]
                                links[i] = { ...links[i], href: e.target.value }
                                patchSectionSideInfo(s.id, { links })
                              }}
                            />
                            <button
                              type="button"
                              className={styles.textButton}
                              onClick={() => {
                                const links = (s.content?.sideInfo?.links ?? []).filter((_, j) => j !== i)
                                patchSectionSideInfo(s.id, {
                                  links: links.length ? links : undefined,
                                })
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className={styles.field}>
                        <div className={styles.sideInfoListHeader}>
                          <span className={styles.label}>Awards &amp; Nominations</span>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => {
                              const awards: SectionSideInfoAward[] = [
                                ...(s.content?.sideInfo?.awards ?? []),
                                { type: 'awarded', label: '', href: '' },
                              ]
                              patchSectionSideInfo(s.id, { awards })
                            }}
                          >
                            Add award
                          </button>
                        </div>
                        {(s.content?.sideInfo?.awards ?? []).map((award, i) => (
                          <div key={`award-${s.id}-${i}`} className={styles.sideInfoRepeatRow}>
                            <select
                              className={styles.input}
                              aria-label={`Award ${i + 1} type`}
                              value={award.type}
                              onChange={(e) => {
                                const awards = [...(s.content?.sideInfo?.awards ?? [])]
                                awards[i] = { ...awards[i], type: e.target.value as SectionSideInfoAward['type'] }
                                patchSectionSideInfo(s.id, { awards })
                              }}
                            >
                              <option value="awarded">Awarded</option>
                              <option value="nominated">Nominated</option>
                            </select>
                            <input
                              className={styles.input}
                              aria-label={`Award ${i + 1} name`}
                              placeholder="Award name"
                              value={award.label}
                              onChange={(e) => {
                                const awards = [...(s.content?.sideInfo?.awards ?? [])]
                                awards[i] = { ...awards[i], label: e.target.value }
                                patchSectionSideInfo(s.id, { awards })
                              }}
                            />
                            <input
                              className={styles.input}
                              aria-label={`Award ${i + 1} URL (optional)`}
                              placeholder="https:// (optional)"
                              value={award.href ?? ''}
                              onChange={(e) => {
                                const awards = [...(s.content?.sideInfo?.awards ?? [])]
                                awards[i] = {
                                  ...awards[i],
                                  href: e.target.value.trim() ? e.target.value : undefined,
                                }
                                patchSectionSideInfo(s.id, { awards })
                              }}
                            />
                            <button
                              type="button"
                              className={styles.textButton}
                              onClick={() => {
                                const awards = (s.content?.sideInfo?.awards ?? []).filter((_, j) => j !== i)
                                patchSectionSideInfo(s.id, {
                                  awards: awards.length ? awards : undefined,
                                })
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className={styles.field}>
                        <div className={styles.sideInfoListHeader}>
                          <span className={styles.label}>Collaborators</span>
                          <button
                            type="button"
                            className={styles.textButton}
                            onClick={() => {
                              const collaborators = [...(s.content?.sideInfo?.collaborators ?? []), {}]
                              patchSectionSideInfo(s.id, { collaborators })
                            }}
                          >
                            Add partner
                          </button>
                        </div>
                        {(s.content?.sideInfo?.collaborators ?? []).map((c, i) => (
                          <div key={`collab-${s.id}-${i}`} className={styles.sideInfoRepeatCol}>
                            <SectionMediaUpload
                              label={`Partner ${i + 1} logo (image)`}
                              accept="image/*"
                              value={c.logo?.type === 'image' ? c.logo : undefined}
                              onChange={(media) => {
                                const collaborators = [...(s.content?.sideInfo?.collaborators ?? [])]
                                if (media?.type === 'image') {
                                  collaborators[i] = {
                                    ...collaborators[i],
                                    logo: media,
                                    logoSrc: undefined,
                                    logoAlt: undefined,
                                  }
                                } else {
                                  collaborators[i] = { ...collaborators[i], logo: undefined }
                                }
                                patchSectionSideInfo(s.id, { collaborators })
                              }}
                              uploadFolder={uploadFolder}
                            />
                            <div className={styles.row}>
                              <input
                                className={styles.input}
                                style={{ flex: '1 1 8rem' }}
                                aria-label={`Partner ${i + 1} name`}
                                placeholder="Name (optional)"
                                value={c.name ?? ''}
                                onChange={(e) => {
                                  const collaborators = [...(s.content?.sideInfo?.collaborators ?? [])]
                                  collaborators[i] = {
                                    ...collaborators[i],
                                    name: e.target.value.trim() ? e.target.value : undefined,
                                  }
                                  patchSectionSideInfo(s.id, { collaborators })
                                }}
                              />
                              <input
                                className={styles.input}
                                style={{ flex: '1 1 8rem' }}
                                aria-label={`Partner ${i + 1} link`}
                                placeholder="Link (optional)"
                                value={c.url ?? ''}
                                onChange={(e) => {
                                  const collaborators = [...(s.content?.sideInfo?.collaborators ?? [])]
                                  collaborators[i] = {
                                    ...collaborators[i],
                                    url: e.target.value.trim() ? e.target.value : undefined,
                                  }
                                  patchSectionSideInfo(s.id, { collaborators })
                                }}
                              />
                              <button
                                type="button"
                                className={styles.textButton}
                                onClick={() => {
                                  const collaborators = (s.content?.sideInfo?.collaborators ?? []).filter(
                                    (_, j) => j !== i,
                                  )
                                  patchSectionSideInfo(s.id, {
                                    collaborators: collaborators.length ? collaborators : undefined,
                                  })
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className={styles.contentSectionActions}>
                    <button
                      type="button"
                      className={styles.submit}
                      disabled={savingContentSectionId === s.id}
                      onClick={() => handleSaveSectionContent(s.id)}
                    >
                      {savingContentSectionId === s.id ? 'Saving…' : 'Save section'}
                    </button>
                    {savingContentSectionId !== s.id && (
                      <span className={styles.sectionContentSaved}>Saved content appears on the project page.</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
