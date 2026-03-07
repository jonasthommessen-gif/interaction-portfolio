import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchArchivePostById,
  replaceArchivePostMedia,
  updateArchivePost,
  uploadPortfolioMedia,
} from '../lib/cms'
import styles from './AdminProjectEditPage.module.css'

type MediaSlot =
  | { id: string; kind: 'existing'; type: 'image' | 'video'; src: string }
  | { id: string; kind: 'new'; file: File }

function MediaThumbFile({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  if (!url) return <span className={styles.mediaThumbPlaceholder}>…</span>
  if (file.type.startsWith('video/')) {
    return <video src={url} muted className={styles.mediaThumb} aria-hidden />
  }
  return <img src={url} alt="" className={styles.mediaThumb} />
}

function MediaThumbSlot({ slot }: { slot: MediaSlot }) {
  if (slot.kind === 'existing') {
    if (slot.type === 'video') {
      return <video src={slot.src} muted className={styles.mediaThumb} aria-hidden />
    }
    return <img src={slot.src} alt="" className={styles.mediaThumb} />
  }
  return <MediaThumbFile file={slot.file} />
}

export function AdminArchiveEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState('')
  const [mediaList, setMediaList] = useState<MediaSlot[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchArchivePostById(id)
      .then((post) => {
        if (post) {
          setTitle(post.title)
          setDescription(post.description ?? '')
          setCategories(Array.isArray(post.categories) ? post.categories.join(', ') : '')
          setMediaList(
            post.media.map((m, i) => ({
              id: `existing-${i}-${m.src}`,
              kind: 'existing' as const,
              type: m.type,
              src: m.src,
            }))
          )
        } else {
          setError('Post not found')
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : []
    const newSlots: MediaSlot[] = list.map((f) => ({
      id: crypto.randomUUID(),
      kind: 'new',
      file: f,
    }))
    setMediaList((prev) => [...prev, ...newSlots])
    e.target.value = ''
  }

  const handleDragStart = (e: React.DragEvent, slotId: string) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify({ id: slotId }))
    setDraggedId(slotId)
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
    const fromIdx = mediaList.findIndex((s) => s.id === payload.id)
    if (fromIdx === -1 || fromIdx === targetIndex) {
      setDraggedId(null)
      return
    }
    const copy = [...mediaList]
    const [dragged] = copy.splice(fromIdx, 1)
    copy.splice(targetIndex, 0, dragged)
    setMediaList(copy)
    setDraggedId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverKey(null)
  }

  const handleRemove = (slotId: string) => {
    setMediaList((prev) => prev.filter((s) => s.id !== slotId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !title.trim()) {
      setError('Title is required.')
      return
    }
    setSaving(true)
    setError(null)
    const categoryList = categories.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    const mediaOut: { type: 'image' | 'video'; src: string; alt?: string }[] = []
    for (const slot of mediaList) {
      if (slot.kind === 'existing') {
        mediaOut.push({ type: slot.type, src: slot.src })
      } else {
        const type = slot.file.type.startsWith('video/') ? ('video' as const) : ('image' as const)
        const { url, error: err } = await uploadPortfolioMedia(slot.file)
        if (err) {
          setError(`Upload failed: ${err}`)
          setSaving(false)
          return
        }
        if (url) mediaOut.push({ type, src: url })
      }
    }
    const cover_src = mediaOut.length ? mediaOut[0].src : ''
    const { error: updateErr } = await updateArchivePost(id, {
      title: title.trim(),
      description: description.trim(),
      categories: categoryList,
      cover_src,
    })
    if (updateErr) {
      setError(updateErr)
      setSaving(false)
      return
    }
    const { error: mediaErr } = await replaceArchivePostMedia(id, mediaOut)
    setSaving(false)
    if (mediaErr) {
      setError(mediaErr)
      return
    }
    navigate('/admin/archive')
  }

  if (loading) return <p className={styles.message}>Loading…</p>
  if (error && !title) return <p className={styles.error}>{error}</p>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Edit archive post</h2>
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
          {mediaList.length > 0 && (
            <ul className={styles.mediaList} aria-label="Media order">
              {mediaList.map((slot, index) => {
                const itemKey = `media-${slot.id}`
                const isDragging = draggedId === slot.id
                const isDragOver = dragOverKey === itemKey
                return (
                  <li
                    key={slot.id}
                    className={styles.mediaItem}
                    data-dragging={isDragging}
                    data-drag-over={isDragOver}
                    draggable
                    onDragStart={(e) => handleDragStart(e, slot.id)}
                    onDragOver={(e) => handleDragOver(e, itemKey)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                  >
                    <span className={styles.mediaPosition} aria-hidden>
                      {index === 0 ? 'Cover' : index + 1}
                    </span>
                    <div className={styles.mediaThumbWrap}>
                      <MediaThumbSlot slot={slot} />
                    </div>
                    <span className={styles.mediaDragHandle} title="Drag to reorder" aria-hidden>⋮⋮</span>
                    <button
                      type="button"
                      className={styles.mediaRemoveBtn}
                      onClick={() => handleRemove(slot.id)}
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
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
