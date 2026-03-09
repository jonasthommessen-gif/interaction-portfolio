import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  createProjectSection,
  deleteProjectSection,
  fetchProjectRowBySlug,
  fetchProjectSections,
  updateProject,
  updateProjectSection,
} from '../lib/cms'
import type { ProjectRow, ProjectSectionRow } from '../types/cms'
import type { SectionContent, SectionLayoutKey } from '../types/cms'
import { SECTION_LAYOUTS } from '../types/cms'
import { SectionGalleryUpload } from '../components/SectionGalleryUpload'
import { SectionMediaUpload } from '../components/SectionMediaUpload'
import styles from './AdminProjectEditPage.module.css'

const LAYOUTS_WITH_SINGLE_MEDIA: SectionLayoutKey[] = [
  'text-left-media-right',
  'media-left-text-right',
  'media-above-text',
  'full-bleed-media',
]

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
  const [contentSectionError, setContentSectionError] = useState<string | null>(null)
  const [coverType, setCoverType] = useState<'image' | 'video'>('image')
  const [coverSrc, setCoverSrc] = useState('')
  const [coverPoster, setCoverPoster] = useState<string | null>(null)
  const [coverAlt, setCoverAlt] = useState('')
  const [coverObjectPosition, setCoverObjectPosition] = useState('50% 50%')
  const [coverObjectScale, setCoverObjectScale] = useState(1)
  const [coverObjectRotation, setCoverObjectRotation] = useState(0)

  const loadSections = useCallback((projectId: string) => {
    setSectionsLoading(true)
    fetchProjectSections(projectId)
      .then(setSections)
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
      order: sections.length,
      content: { body: '' },
    })
    setAddingSection(false)
    if (error) {
      setSectionError(error)
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
          cropAspectRatio="16/10"
          cropFrameLabel="Project card on the site"
          cropEnableZoom
          cropEnableRotation
        />
      </section>

      <section className={styles.sectionsBlock} aria-labelledby="sections-heading">
        <h3 id="sections-heading" className={styles.sectionsHeading}>Sections</h3>
        {sectionsLoading && <p className={styles.message}>Loading sections…</p>}
        <ul className={styles.sectionList}>
          {sections.map((s) => (
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
                  <span className={styles.sectionLabel}>{s.label}</span>
                  <span className={styles.sectionLayout}>{s.layout}</span>
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
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          {sectionError && <p className={styles.error}>{sectionError}</p>}
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
            {contentSectionError && <p className={styles.error}>{contentSectionError}</p>}
            {sections.map((s) => (
              <div key={s.id} className={styles.contentSectionCard} id={`content-section-${s.id}`}>
                <div className={styles.contentSectionHeader}>
                  <h4 className={styles.contentSectionTitle}>{s.label}</h4>
                  <span className={styles.contentSectionLayout}>{s.layout}</span>
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
                      className={styles.textarea}
                      rows={4}
                      placeholder="Section body content"
                    />
                  </div>
                  {LAYOUTS_WITH_SINGLE_MEDIA.includes(s.layout) && (
                    <SectionMediaUpload
                      value={s.content?.media}
                      onChange={(media) => updateSectionContent(s.id, { media })}
                      uploadFolder={uploadFolder}
                    />
                  )}
                  {s.layout === 'gallery-strip' && (
                    <SectionGalleryUpload
                      value={s.content?.gallery}
                      onChange={(gallery) => updateSectionContent(s.id, { gallery })}
                      uploadFolder={uploadFolder}
                    />
                  )}
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
