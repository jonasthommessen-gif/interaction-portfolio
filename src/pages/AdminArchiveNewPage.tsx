import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createArchivePost, uploadPortfolioMedia } from '../lib/cms'
import styles from './AdminProjectEditPage.module.css'

export function AdminArchiveNewPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : []
    setFiles(list)
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
    const uploaded: { type: 'image' | 'video'; src: string; alt?: string }[] = []
    for (const file of files) {
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
            id="archive-files"
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            className={styles.input}
          />
          {files.length > 0 && (
            <span className={styles.fileHint}>{files.length} file(s) selected</span>
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
