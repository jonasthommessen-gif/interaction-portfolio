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
import { SECTION_LAYOUTS } from '../types/cms'
import styles from './AdminProjectEditPage.module.css'

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
  const [editSectionBody, setEditSectionBody] = useState('')
  const [sectionError, setSectionError] = useState<string | null>(null)

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
    setEditSectionBody(s.content?.body ?? '')
    setSectionError(null)
  }

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSectionId) return
    setSectionError(null)
    const { error } = await updateProjectSection(editingSectionId, {
      label: editSectionLabel.trim(),
      content: { ...sections.find((x) => x.id === editingSectionId)?.content, body: editSectionBody },
    })
    if (error) {
      setSectionError(error)
      return
    }
    setEditingSectionId(null)
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Edit project</h2>
        <Link to="/admin/projects" className={styles.back}>← Back to Projects</Link>
      </div>

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

      <section className={styles.sectionsBlock} aria-labelledby="sections-heading">
        <h3 id="sections-heading" className={styles.sectionsHeading}>Sections</h3>
        {sectionsLoading && <p className={styles.message}>Loading sections…</p>}
        <ul className={styles.sectionList}>
          {sections.map((s) => (
            <li key={s.id} className={styles.sectionItem}>
              {editingSectionId === s.id ? (
                <form onSubmit={handleSaveSection} className={styles.sectionEditForm}>
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
                  <div className={styles.field}>
                    <label className={styles.label}>Body text</label>
                    <textarea
                      value={editSectionBody}
                      onChange={(e) => setEditSectionBody(e.target.value)}
                      className={styles.textarea}
                      rows={4}
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
                  <button type="button" className={styles.sectionBtn} onClick={() => startEditSection(s)}>
                    Edit
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
  )
}
