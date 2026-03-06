import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  deleteArchivePost,
  fetchArchiveProjects,
  updateArchivePost,
} from '../lib/cms'
import type { ArchiveProject } from '../types/cms'
import styles from './AdminArchivePage.module.css'

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

export function AdminArchivePage() {
  const [posts, setPosts] = useState<ArchiveProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [postToDelete, setPostToDelete] = useState<ArchiveProject | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const cancelBtnRef = useRef<HTMLButtonElement>(null)

  const visiblePosts = posts.filter((p) => p.visible)
  const hiddenPosts = posts.filter((p) => !p.visible)

  const loadPosts = useCallback(() => {
    return fetchArchiveProjects()
      .then((data) => setPosts(data.sort((a, b) => a.order - b.order)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [])

  useEffect(() => {
    setLoading(true)
    loadPosts().finally(() => setLoading(false))
  }, [loadPosts])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (postToDelete) {
      const t = requestAnimationFrame(() => cancelBtnRef.current?.focus())
      return () => cancelAnimationFrame(t)
    }
  }, [postToDelete])

  const handleToggleVisible = async (p: ArchiveProject) => {
    setActionLoading(p.id)
    const { error: err } = await updateArchivePost(p.id, { visible: !p.visible })
    setActionLoading(null)
    if (err) setError(err)
    else {
      await loadPosts()
      setToast('Visibility updated')
    }
  }

  const handleReorder = async (dragged: ArchiveProject, target: ArchiveProject) => {
    if (dragged.id === target.id) return
    setActionLoading(dragged.id)
    const { error: err1 } = await updateArchivePost(dragged.id, { order: target.order })
    const { error: err2 } = await updateArchivePost(target.id, { order: dragged.order })
    setActionLoading(null)
    setDraggedId(null)
    setDragOverKey(null)
    if (err1 || err2) setError(err1 ?? err2 ?? 'Failed to reorder')
    else {
      await loadPosts()
      setToast('Order updated')
    }
  }

  const handleDragStart = (e: React.DragEvent, post: ArchiveProject) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', post.id)
    e.dataTransfer.setData('application/json', JSON.stringify({ id: post.id, order: post.order }))
    setDraggedId(post.id)
  }

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverKey(key)
  }

  const handleDragLeave = () => setDragOverKey(null)

  const handleDrop = (e: React.DragEvent, targetPost: ArchiveProject, _list: ArchiveProject[]) => {
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
    const draggedPost = posts.find((p) => p.id === payload.id)
    if (!draggedPost || draggedPost.id === targetPost.id) {
      setDraggedId(null)
      return
    }
    handleReorder(draggedPost, targetPost)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverKey(null)
  }

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return
    setActionLoading(postToDelete.id)
    const { error: err } = await deleteArchivePost(postToDelete.id)
    setActionLoading(null)
    setPostToDelete(null)
    if (err) setError(err)
    else {
      await loadPosts()
      setToast('Post deleted')
    }
  }

  if (loading) return <p className={styles.message}>Loading archive…</p>
  if (error) return <p className={styles.error}>{error}</p>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Archive</h2>
        <p className={styles.hint}>
          {editMode
            ? 'Reorder, toggle visibility, or delete. Changes save immediately.'
            : 'Instagram-style posts with photos and videos.'}
        </p>
        <div className={styles.actions}>
          <Link to="/admin/archive/new" className={styles.newLink}>+ New post</Link>
          <button
            type="button"
            className={styles.editModeBtn}
            onClick={() => setEditMode((e) => !e)}
            aria-pressed={editMode}
          >
            {editMode ? 'Done' : 'Edit archive'}
          </button>
        </div>
      </div>

      {toast && <p className={styles.toast} role="status">{toast}</p>}

      {posts.length === 0 && (
        <p className={styles.empty}>No archive posts yet. Create one with <strong>+ New post</strong>.</p>
      )}

      {posts.length > 0 && (
        <>
          <section className={styles.listSection} aria-labelledby="archive-visible-heading">
            <h3 id="archive-visible-heading" className={styles.sectionHeading}>Visible posts</h3>
            <ul className={styles.list} data-edit-mode={editMode}>
              {visiblePosts.map((p, i) => {
                const itemKey = `visible-${p.id}`
                const isDragging = draggedId === p.id
                const isDragOver = dragOverKey === itemKey
                return (
                  <li
                    key={p.id}
                    className={styles.item}
                    data-dragging={isDragging}
                    data-drag-over={isDragOver}
                    onDragOver={editMode ? (e) => handleDragOver(e, itemKey) : undefined}
                    onDragLeave={editMode ? handleDragLeave : undefined}
                    onDrop={editMode ? (e) => handleDrop(e, p, visiblePosts) : undefined}
                  >
                    <span className={styles.thumb}>
                      <img src={p.cover} alt="" width={48} height={48} />
                    </span>
                    <span className={styles.order}>{i + 1}</span>
                    <span className={styles.visible} data-visible={p.visible}>
                      {p.visible ? 'Visible' : 'Hidden'}
                    </span>
                    <span className={styles.title}>{p.title}</span>
                    <span className={styles.meta}>{p.tags?.slice(0, 2).join(', ')}</span>
                    <Link to="/archive" className={styles.enter}>Enter</Link>
                    {editMode && (
                      <div className={styles.itemActions}>
                        <span
                          className={styles.dragHandle}
                          draggable
                          onDragStart={(e) => handleDragStart(e, p)}
                          onDragEnd={handleDragEnd}
                          role="button"
                          tabIndex={0}
                          aria-label="Reorder post"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') e.preventDefault()
                          }}
                        >
                          <IconDragHandle />
                        </span>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => handleToggleVisible(p)}
                          disabled={!!actionLoading}
                          aria-label={p.visible ? 'Hide post' : 'Show post'}
                          title={p.visible ? 'Visible' : 'Hidden'}
                        >
                          {p.visible ? <IconEye /> : <IconEyeOff />}
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtnIcon}
                          onClick={() => setPostToDelete(p)}
                          disabled={!!actionLoading}
                          aria-label="Delete post"
                          title="Delete"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {visiblePosts.length === 0 && (
              <p className={styles.sectionEmpty}>No visible posts. Toggle visibility in the list below.</p>
            )}
          </section>

          <section className={styles.listSection} aria-labelledby="archive-hidden-heading">
            <h3 id="archive-hidden-heading" className={styles.sectionHeading}>Not visible</h3>
            <ul className={styles.list} data-edit-mode={editMode}>
              {hiddenPosts.map((p, i) => {
                const itemKey = `hidden-${p.id}`
                const isDragging = draggedId === p.id
                const isDragOver = dragOverKey === itemKey
                return (
                  <li
                    key={p.id}
                    className={styles.item}
                    data-dragging={isDragging}
                    data-drag-over={isDragOver}
                    onDragOver={editMode ? (e) => handleDragOver(e, itemKey) : undefined}
                    onDragLeave={editMode ? handleDragLeave : undefined}
                    onDrop={editMode ? (e) => handleDrop(e, p, hiddenPosts) : undefined}
                  >
                    <span className={styles.thumb}>
                      <img src={p.cover} alt="" width={48} height={48} />
                    </span>
                    <span className={styles.order}>{visiblePosts.length + i + 1}</span>
                    <span className={styles.visible} data-visible={p.visible}>
                      {p.visible ? 'Visible' : 'Hidden'}
                    </span>
                    <span className={styles.title}>{p.title}</span>
                    <span className={styles.meta}>{p.tags?.slice(0, 2).join(', ')}</span>
                    <Link to="/archive" className={styles.enter}>Enter</Link>
                    {editMode && (
                      <div className={styles.itemActions}>
                        <span
                          className={styles.dragHandle}
                          draggable
                          onDragStart={(e) => handleDragStart(e, p)}
                          onDragEnd={handleDragEnd}
                          role="button"
                          tabIndex={0}
                          aria-label="Reorder post"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') e.preventDefault()
                          }}
                        >
                          <IconDragHandle />
                        </span>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => handleToggleVisible(p)}
                          disabled={!!actionLoading}
                          aria-label={p.visible ? 'Hide post' : 'Show post'}
                          title={p.visible ? 'Visible' : 'Hidden'}
                        >
                          {p.visible ? <IconEye /> : <IconEyeOff />}
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtnIcon}
                          onClick={() => setPostToDelete(p)}
                          disabled={!!actionLoading}
                          aria-label="Delete post"
                          title="Delete"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            {hiddenPosts.length === 0 && (
              <p className={styles.sectionEmpty}>No hidden posts. Use the eye icon above to hide a post and it will appear here.</p>
            )}
          </section>
        </>
      )}

      {postToDelete && (
        <div
          className={styles.dialogOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-delete-dialog-title"
          onKeyDown={(e) => e.key === 'Escape' && setPostToDelete(null)}
        >
          <div className={styles.dialog}>
            <h3 id="archive-delete-dialog-title" className={styles.dialogTitle}>
              Delete post?
            </h3>
            <p className={styles.dialogBody}>
              Are you sure you want to delete &quot;{postToDelete.title}&quot;? You can add a new post later.
            </p>
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setPostToDelete(null)}
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
                {actionLoading === postToDelete.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
