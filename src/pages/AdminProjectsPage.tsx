import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteProject,
  fetchProjects,
  getProjectsStaticReason,
  importStaticProjectsToDb,
  updateProject,
} from '../lib/cms'
import type { Project } from '../types/cms'
import styles from './AdminProjectsPage.module.css'
import projectStyles from './ProjectsPage.module.css'

type RGB = readonly [number, number, number]

function hexToRgb(hex: string): RGB {
  const raw = hex.replace('#', '').trim()
  const normalized = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const value = Number.parseInt(normalized, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return [r, g, b]
}

function rgbToHex([r, g, b]: RGB): `#${string}` {
  const to2 = (n: number) => n.toString(16).padStart(2, '0')
  return `#${to2(r)}${to2(g)}${to2(b)}`
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  const mix = (x: number, y: number) => Math.round(x * (1 - t) + y * t)
  return [mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2])] as const
}

function relativeLuminance([r, g, b]: RGB) {
  const toLinear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function pickTextColor(bgHex: string) {
  const lum = relativeLuminance(hexToRgb(bgHex))
  return lum > 0.58 ? '#0b0c10' : '#ffffff'
}

function derivePillBg(fromHex: string, toHex: string) {
  const from = hexToRgb(fromHex)
  const to = hexToRgb(toHex)
  const base = mixRgb(from, to, 0.5)
  const lum = relativeLuminance(base)
  const target = lum < 0.35 ? ([255, 255, 255] as const) : ([0, 0, 0] as const)
  const strength = lum < 0.35 ? 0.3 : 0.35
  return rgbToHex(mixRgb(base, target, strength))
}

function getImageAverageRgb(src: string): Promise<RGB | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve(null)
          return
        }
        const w = 12
        const h = 12
        canvas.width = w
        canvas.height = h
        ctx.drawImage(img, 0, 0, w, h)
        const { data } = ctx.getImageData(0, 0, w, h)
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 8) continue
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count += 1
        }
        if (!count) {
          resolve(null)
          return
        }
        resolve([Math.round(r / count), Math.round(g / count), Math.round(b / count)] as const)
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

type PillTheme = { bg: string; fg: string }

const ICON_SIZE = 20

function IconDragHandle() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <circle cx="9" cy="6" r="1.5" fill="currentColor" />
      <circle cx="15" cy="6" r="1.5" fill="currentColor" />
      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      <circle cx="9" cy="18" r="1.5" fill="currentColor" />
      <circle cx="15" cy="18" r="1.5" fill="currentColor" />
    </svg>
  )
}

function IconEye() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

export function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pillThemes, setPillThemes] = useState<Record<string, PillTheme>>({})
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [staticReason, setStaticReason] = useState<'no-env' | 'error' | 'empty' | null>(null)
  const [staticErrorMessage, setStaticErrorMessage] = useState<string | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const cancelBtnRef = useRef<HTMLButtonElement>(null)

  const visibleProjects = projects.filter((p) => p.visible)
  const hiddenProjects = projects.filter((p) => !p.visible)

  const loadProjects = useCallback(() => {
    return fetchProjects()
      .then((data) => setProjects(data.sort((a, b) => a.order - b.order)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  useEffect(() => {
    setLoading(true)
    loadProjects().finally(() => setLoading(false))
  }, [loadProjects])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  // Derive pill colors from cover images (same logic as ProjectsPage)
  useEffect(() => {
    let cancelled = false
    async function run() {
      const entries = await Promise.all(
        projects.map(async (p) => {
          if (p.cover.type !== 'image') return [p.slug, null] as const
          const avg = await getImageAverageRgb(p.cover.src)
          if (!avg) return [p.slug, null] as const
          const lum = relativeLuminance(avg)
          const target = lum < 0.35 ? ([255, 255, 255] as const) : ([0, 0, 0] as const)
          const strength = lum < 0.35 ? 0.26 : 0.34
          const pillBg = rgbToHex(mixRgb(avg, target, strength))
          const pillFg = pickTextColor(pillBg)
          return [p.slug, { bg: pillBg, fg: pillFg }] as const
        }),
      )
      if (cancelled) return
      const map: Record<string, PillTheme> = {}
      for (const [slug, theme] of entries) {
        if (theme) map[slug] = theme
      }
      setPillThemes(map)
    }
    run()
    return () => {
      cancelled = true
    }
  }, [projects])

  useEffect(() => {
    if (projectToDelete) {
      const t = requestAnimationFrame(() => {
        cancelBtnRef.current?.focus()
      })
      return () => cancelAnimationFrame(t)
    }
  }, [projectToDelete])

  // Diagnose why list is static (no-env / error / empty) when we have no project ids
  useEffect(() => {
    if (projects.some((p) => p.id) || projects.length === 0) {
      setStaticReason(null)
      setStaticErrorMessage(null)
      return
    }
    let cancelled = false
    getProjectsStaticReason().then((result) => {
      if (cancelled) return
      if (!result) {
        setStaticReason(null)
        setStaticErrorMessage(null)
        return
      }
      setStaticReason(result.reason)
      setStaticErrorMessage('error' in result ? result.errorMessage : null)
    })
    return () => {
      cancelled = true
    }
  }, [projects])

  const handleImportStatic = async () => {
    setImportLoading(true)
    const result = await importStaticProjectsToDb()
    setImportLoading(false)
    if ('error' in result) {
      setToast(null)
      setError(result.error)
      return
    }
    const msg = result.errors?.length
      ? `Imported ${result.imported} projects; ${result.errors.length} failed.`
      : `Imported ${result.imported} projects.`
    setToast(msg)
    await loadProjects()
  }

  const handleToggleVisible = async (p: Project) => {
    if (!p.id) return
    setActionLoading(p.id)
    const { error: err } = await updateProject(p.id, { visible: !p.visible })
    setActionLoading(null)
    if (err) setError(err)
    else {
      await loadProjects()
      setToast('Visibility updated')
    }
  }

  const handleReorder = async (dragged: Project, target: Project) => {
    if (!dragged.id || !target.id || dragged.id === target.id) return
    setActionLoading(dragged.id)
    const { error: err1 } = await updateProject(dragged.id, { order: target.order })
    const { error: err2 } = await updateProject(target.id, { order: dragged.order })
    setActionLoading(null)
    setDraggedId(null)
    setDragOverKey(null)
    if (err1 || err2) setError(err1 ?? err2 ?? 'Failed to reorder')
    else {
      await loadProjects()
      setToast('Order updated')
    }
  }

  const handleDragStart = (e: React.DragEvent, project: Project) => {
    if (!project.id) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', project.id)
    e.dataTransfer.setData('application/json', JSON.stringify({ id: project.id, order: project.order }))
    setDraggedId(project.id)
  }

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverKey(key)
  }

  const handleDragLeave = () => {
    setDragOverKey(null)
  }

  const handleDrop = (e: React.DragEvent, targetProject: Project, list: Project[]) => {
    e.preventDefault()
    setDragOverKey(null)
    const raw = e.dataTransfer.getData('application/json')
    if (!raw) {
      setDraggedId(null)
      return
    }
    let payload: { id: string; order: number }
    try {
      payload = JSON.parse(raw)
    } catch {
      setDraggedId(null)
      return
    }
    const draggedProject = projects.find((p) => p.id === payload.id)
    if (!draggedProject || !targetProject.id) {
      setDraggedId(null)
      return
    }
    if (draggedProject.id === targetProject.id) {
      setDraggedId(null)
      return
    }
    handleReorder(draggedProject, targetProject)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverKey(null)
  }

  const handleDeleteConfirm = async () => {
    if (!projectToDelete?.id) return
    setActionLoading(projectToDelete.id)
    const { error: err } = await deleteProject(projectToDelete.id)
    setActionLoading(null)
    setProjectToDelete(null)
    if (err) setError(err)
    else {
      await loadProjects()
      setToast('Project deleted')
    }
  }

  if (loading) return <p className={styles.message}>Loading projects…</p>
  if (error) return <p className={styles.error}>{error}</p>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Projects</h2>
        <p className={styles.hint}>
          {editMode
            ? 'Reorder, toggle visibility, or delete. Changes save immediately.'
            : 'Edit visibility, order, and sections from each project’s edit page.'}
        </p>
        <div className={styles.actions}>
          <Link to="/admin/projects/new" className={styles.newLink}>
            + New project
          </Link>
          <button
            type="button"
            className={styles.editModeBtn}
            onClick={() => setEditMode((e) => !e)}
            aria-pressed={editMode}
          >
            {editMode ? 'Done' : 'Edit projects'}
          </button>
        </div>
      </div>

      {toast && <p className={styles.toast} role="status">{toast}</p>}

      {projects.length === 0 && (
        <p className={styles.empty}>
          No projects yet. Create your first project with <strong>+ New project</strong>.
        </p>
      )}

      {projects.length > 0 && (
        <>
          <section className={styles.listSection} aria-labelledby="visible-heading">
            <h3 id="visible-heading" className={styles.sectionHeading}>Visible projects</h3>
            <ul className={styles.list} data-edit-mode={editMode}>
              {visibleProjects.map((p, i) => {
                const itemKey = `visible-${p.slug}`
                const isDragging = draggedId === p.id
                const isDragOver = dragOverKey === itemKey
                return (
                  <li
                    key={p.slug}
                    className={styles.item}
                    data-dragging={isDragging}
                    data-drag-over={isDragOver}
                    onDragOver={editMode && p.id ? (e) => handleDragOver(e, itemKey) : undefined}
                    onDragLeave={editMode ? handleDragLeave : undefined}
                    onDrop={editMode && p.id ? (e) => handleDrop(e, p, visibleProjects) : undefined}
                  >
                    <span className={styles.thumb}>
                      {p.cover.type === 'video' ? (
                        <video src={p.cover.src} poster={p.cover.poster} muted width={48} height={48} aria-hidden />
                      ) : (
                        <img src={p.cover.src} alt="" width={48} height={48} />
                      )}
                    </span>
                    <span className={styles.order}>{i + 1}</span>
                    <span className={styles.visible} data-visible={p.visible}>
                      {p.visible ? 'Visible' : 'Hidden'}
                    </span>
                    <span className={styles.title}>{p.title}</span>
                    <span className={styles.slug}>{p.slug}</span>
                    <Link to={`/admin/projects/edit/${p.slug}`} className={styles.enter}>
                      Enter
                    </Link>
                    {editMode && (
                      <div className={styles.itemActions}>
                        <span
                          className={styles.dragHandle}
                          draggable={!!p.id}
                          onDragStart={p.id ? (e) => handleDragStart(e, p) : undefined}
                          onDragEnd={handleDragEnd}
                          role="button"
                          tabIndex={p.id ? 0 : -1}
                          aria-label={p.id ? 'Reorder project' : 'Reorder (database projects only)'}
                          aria-disabled={!p.id}
                          title={!p.id ? 'Only database projects can be reordered' : undefined}
                          onKeyDown={p.id ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.currentTarget.focus()
                            }
                          } : undefined}
                        >
                          <IconDragHandle />
                        </span>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => p.id && handleToggleVisible(p)}
                          disabled={!!actionLoading || !p.id}
                          aria-label={p.id ? (p.visible ? 'Hide project' : 'Show project') : 'Toggle visibility (database projects only)'}
                          title={!p.id ? 'Only database projects can be toggled' : (p.visible ? 'Visible' : 'Hidden')}
                        >
                          {p.visible ? <IconEye /> : <IconEyeOff />}
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtnIcon}
                          onClick={() => p.id && setProjectToDelete(p)}
                          disabled={!!actionLoading || !p.id}
                          aria-label={p.id ? 'Delete project' : 'Delete (database projects only)'}
                          title={!p.id ? 'Only database projects can be deleted' : 'Delete'}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {visibleProjects.length === 0 && (
              <p className={styles.sectionEmpty}>No visible projects. Toggle visibility in the list below.</p>
            )}
          </section>

          <section className={styles.listSection} aria-labelledby="hidden-heading">
            <h3 id="hidden-heading" className={styles.sectionHeading}>Not visible</h3>
            <ul className={styles.list} data-edit-mode={editMode}>
              {hiddenProjects.map((p, i) => {
                const itemKey = `hidden-${p.slug}`
                const isDragging = draggedId === p.id
                const isDragOver = dragOverKey === itemKey
                return (
                  <li
                    key={p.slug}
                    className={styles.item}
                    data-dragging={isDragging}
                    data-drag-over={isDragOver}
                    onDragOver={editMode && p.id ? (e) => handleDragOver(e, itemKey) : undefined}
                    onDragLeave={editMode ? handleDragLeave : undefined}
                    onDrop={editMode && p.id ? (e) => handleDrop(e, p, hiddenProjects) : undefined}
                  >
                    <span className={styles.thumb}>
                      {p.cover.type === 'video' ? (
                        <video src={p.cover.src} poster={p.cover.poster} muted width={48} height={48} aria-hidden />
                      ) : (
                        <img src={p.cover.src} alt="" width={48} height={48} />
                      )}
                    </span>
                    <span className={styles.order}>{visibleProjects.length + i + 1}</span>
                    <span className={styles.visible} data-visible={p.visible}>
                      {p.visible ? 'Visible' : 'Hidden'}
                    </span>
                    <span className={styles.title}>{p.title}</span>
                    <span className={styles.slug}>{p.slug}</span>
                    <Link to={`/admin/projects/edit/${p.slug}`} className={styles.enter}>
                      Enter
                    </Link>
                    {editMode && (
                      <div className={styles.itemActions}>
                        <span
                          className={styles.dragHandle}
                          draggable={!!p.id}
                          onDragStart={p.id ? (e) => handleDragStart(e, p) : undefined}
                          onDragEnd={handleDragEnd}
                          role="button"
                          tabIndex={p.id ? 0 : -1}
                          aria-label={p.id ? 'Reorder project' : 'Reorder (database projects only)'}
                          aria-disabled={!p.id}
                          title={!p.id ? 'Only database projects can be reordered' : undefined}
                          onKeyDown={p.id ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              e.currentTarget.focus()
                            }
                          } : undefined}
                        >
                          <IconDragHandle />
                        </span>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => p.id && handleToggleVisible(p)}
                          disabled={!!actionLoading || !p.id}
                          aria-label={p.id ? (p.visible ? 'Hide project' : 'Show project') : 'Toggle visibility (database projects only)'}
                          title={!p.id ? 'Only database projects can be toggled' : (p.visible ? 'Visible' : 'Hidden')}
                        >
                          {p.visible ? <IconEye /> : <IconEyeOff />}
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtnIcon}
                          onClick={() => p.id && setProjectToDelete(p)}
                          disabled={!!actionLoading || !p.id}
                          aria-label={p.id ? 'Delete project' : 'Delete (database projects only)'}
                          title={!p.id ? 'Only database projects can be deleted' : 'Delete'}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {hiddenProjects.length === 0 && (
              <p className={styles.sectionEmpty}>No hidden projects. Use the eye icon above to hide a project and it will appear here.</p>
            )}
          </section>
        </>
      )}

      {!projects.some((p) => p.id) && projects.length > 0 && (
        <div className={styles.staticHintBlock}>
          {staticReason === 'no-env' && (
            <p className={styles.staticHint}>
              Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env and restart the dev server.
            </p>
          )}
          {staticReason === 'error' && (
            <p className={styles.staticHint}>
              Database error: {staticErrorMessage ?? 'Unknown'}. Check that the migration was run (see docs/SUPABASE_SETUP.md).
            </p>
          )}
          {staticReason === 'empty' && (
            <>
              <p className={styles.staticHint}>
                The projects table is empty. Use &quot;Import projects into database&quot; below to copy the current list into the database; then you can reorder, toggle visibility, and delete.
              </p>
              <button
                type="button"
                className={styles.importBtn}
                onClick={handleImportStatic}
                disabled={importLoading}
              >
                {importLoading ? 'Importing…' : 'Import projects into database'}
              </button>
            </>
          )}
          {staticReason === null && (
            <p className={styles.staticHint}>
              Projects from the database can be reordered and edited here. This list is from static content.
            </p>
          )}
        </div>
      )}

      {projectToDelete && (
        <div
          className={styles.dialogOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          onKeyDown={(e) => e.key === 'Escape' && setProjectToDelete(null)}
        >
          <div className={styles.dialog}>
            <h3 id="delete-dialog-title" className={styles.dialogTitle}>
              Delete project?
            </h3>
            <p className={styles.dialogBody}>
              Are you sure you want to delete &quot;{projectToDelete.title}&quot;? You can add it again later from New project.
            </p>
            <div className={styles.dialogActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setProjectToDelete(null)}
                  ref={cancelBtnRef}
                >
                Cancel
              </button>
              <button
                type="button"
                className={styles.confirmDeleteBtn}
                onClick={handleDeleteConfirm}
                disabled={!!actionLoading}
              >
                {actionLoading === projectToDelete.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <section className={styles.previewSection} aria-labelledby="preview-heading">
          <h3 id="preview-heading" className={styles.previewHeading}>
            Preview: how cards look on the site
          </h3>
          <a
            href="/projects"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.previewLink}
          >
            Open Projects page
          </a>
          <div className={styles.previewMosaicWrap}>
            <div
              className={projectStyles.mosaic}
              data-has-active="true"
              aria-hidden
            >
            {Array.from({ length: Math.ceil(projects.length / 3) }).map((_, rowIndex) => {
              const rowProjects = projects.slice(rowIndex * 3, rowIndex * 3 + 3)
              const rowKey = rowProjects.map((p) => p.slug).join('|')
              return (
                <div key={rowKey} className={projectStyles.row} style={{ ['--row-grow' as string]: 1 }}>
                  {rowProjects.map((project) => {
                    const fallbackPillBg = derivePillBg(project.gradient.from, project.gradient.to)
                    const pillBg = pillThemes[project.slug]?.bg ?? fallbackPillBg
                    const pillFg = pillThemes[project.slug]?.fg ?? pickTextColor(pillBg)
                    const cardStyle = {
                      ['--card-grow' as string]: 1,
                      ['--card-gradient' as string]: `linear-gradient(135deg, ${project.gradient.from}, ${project.gradient.to})`,
                      ['--pill-bg' as string]: pillBg,
                      ['--pill-fg' as string]: pillFg,
                    } as React.CSSProperties
                    return (
                      <Link
                        key={project.slug}
                        to={`/admin/projects/edit/${project.slug}`}
                        className={projectStyles.card}
                        data-active="true"
                        data-hidden={!project.visible}
                        style={cardStyle}
                        aria-label={`Edit project: ${project.title}`}
                      >
                        {project.cover.type === 'video' ? (
                          <video
                            className={projectStyles.media}
                            src={project.cover.src}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <img
                            className={projectStyles.media}
                            src={project.cover.src}
                            alt={project.cover.type === 'image' ? project.cover.alt || project.title : project.title}
                            width={800}
                            height={600}
                          />
                        )}
                        <div className={projectStyles.meta}>
                          <div className={projectStyles.pills}>
                            {project.categories.map((c) => (
                              <span key={c} className={projectStyles.pill}>
                                {c}
                              </span>
                            ))}
                          </div>
                          <h2 className={projectStyles.title}>{project.title}</h2>
                        </div>
                        {!project.visible && <span className={styles.hiddenBadge}>Hidden</span>}
                      </Link>
                    )
                  })}
                </div>
              )
            })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
