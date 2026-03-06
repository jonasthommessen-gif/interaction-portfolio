import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createArchivePost, uploadPortfolioMedia } from '../lib/cms'
import styles from './AdminProjectEditPage.module.css'

type MediaItem = { id: string; file: File }

function MediaThumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  if (!url) return <span className={styles.mediaThumbPlaceholder}>…</span>
  if (file.type.startsWith('video/')) {
    return (
      <video src={url} muted className={styles.mediaThumb} aria-hidden />
    )
  }
  return <img src={url} alt="" className={styles.mediaThumb} />
}

export function AdminArchiveNewPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState('')
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : []
    const newItems: MediaItem[] = list.map((f) => ({ id: crypto.randomUUID(), file: f }))
    setMediaItems((prev) => [...prev, ...newItems])
    e.target.value = ''
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify({ id }))
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverKey(key)
  }

  const handleDragLeave = () => setDragOverKey(null)

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    setDragOverKey(null)
    const raw = e.dataTransfer.getData('application/json')
    if (!raw) {
      setDraggedId(null)
      return
    }
    let payload: { id: string }
    try {
      payload = JSON.parse(raw)
    } catch {
      setDraggedId(null)
      return
    }
    const fromIdx = mediaItems.findIndex((m) => m.id === payload.id)
    if (fromIdx === -1 || fromIdx === targetIndex) {
      setDraggedId(null)
      return
    }
    const copy = [...mediaItems]
    const [dragged] = copy.splice(fromIdx, 1)
    copy.splice(targetIndex, 0, dragged)
    setMediaItems(copy)
    setDraggedId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverKey(null)
  }

  const handleRemove = (id: string) => {
    setMediaItems((prev) => prev.filter((m) => m.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setSaving(true)
    setError(null)
    const categoryList = categories.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    const orderedFiles = mediaItems.map((m) => m.file)
    const uploaded: { type: 'image' | 'video'; src: string; alt?: string }[] = []
    for (const file of orderedFiles) {
      const type = file.type.startsWith('video/') ? 'video' as const : 'image' as const
      const { url, error: err } = await uploadPortfolioMedia(file)
      if (err) {
        setError(`Upload failed: ${err}`)
        setSaving(false)
        return
      }
      if (url) uploaded.push({ type, src: url })
    }
    const cover_src = uploaded.length ? uploaded[0].src : ''
    const { error: createErr } = await createArchivePost(
      {
        title: title.trim(),
        description: description.trim(),
        categories: categoryList,
        cover_src,
      },
      uploaded
    )
    setSaving(false)
    if (createErr) {
      setError(createErr)
      return
    }
    navigate('/admin/archive')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>New archive post</h2>
        <Link to="/admin/archive" className={styles.back}>← Back to Archive</Link>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="archive-title" className={styles.label}>Title</label>
          <input
            id="archive-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="archive-description" className={styles.label}>Description</label>
          <textarea
            id="archive-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textarea}
            rows={3}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="archive-categories" className={styles.label}>Categories (comma-separated)</label>
          <input
            id="archive-categories"
            type="text"
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            className={styles.input}
            placeholder="Photo, Motion"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="archive-files" className={styles.label}>Photos / videos</label>
          <input
            ref={fileInputRef}
            id="archive-files"
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            className={styles.input}
          />
          <p className={styles.mediaOrderHint}>Order below is the post order. Drag to reorder; first item is the cover.</p>
          {mediaItems.length > 0 && (
            <ul className={styles.mediaList} aria-label="Media order">
              {mediaItems.map((item, index) => {
                const itemKey = `media-${item.id}`
                const isDragging = draggedId === item.id
                const isDragOver = dragOverKey === itemKey
                return (
                  <li
                    key={item.id}
                    className={styles.mediaItem}
                    data-dragging={isDragging}
                    data-drag-over={isDragOver}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOver(e, itemKey)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <span className={styles.mediaPosition} aria-hidden>
                      {index === 0 ? 'Cover' : index + 1}
                    </span>
                    <div className={styles.mediaThumbWrap}>
                      <MediaThumb file={item.file} />
                    </div>
                    <span className={styles.mediaDragHandle} title="Drag to reorder" aria-hidden>⋮⋮</span>
                    <button
                      type="button"
                      className={styles.mediaRemoveBtn}
                      onClick={() => handleRemove(item.id)}
                      title="Remove"
                      disabled={saving}
                    >
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? 'Creating…' : 'Create post'}
        </button>
      </form>
    </div>
  )
}
