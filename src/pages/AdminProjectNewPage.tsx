import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProject } from '../lib/cms'
import styles from './AdminProjectEditPage.module.css'

export function AdminProjectNewPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [slugValue, setSlugValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const slug = slugValue.trim() || title.trim().toLowerCase().replace(/\s+/g, '-')
    if (!title.trim() || !slug) {
      setError('Title and slug are required.')
      return
    }
    setSaving(true)
    setError(null)
    const { slug: newSlug, error: err } = await createProject({
      title: title.trim(),
      slug,
    })
    setSaving(false)
    if (err) {
      setError(err)
      return
    }
    navigate(newSlug ? `/admin/projects/edit/${newSlug}` : '/admin/projects')
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>New project</h2>
        <Link to="/admin/projects" className={styles.back}>← Back to Projects</Link>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="new-title" className={styles.label}>Title</label>
          <input
            id="new-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (!slugValue) setSlugValue(e.target.value.trim().toLowerCase().replace(/\s+/g, '-'))
            }}
            className={styles.input}
            placeholder="Project title"
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="new-slug" className={styles.label}>Slug</label>
          <input
            id="new-slug"
            type="text"
            value={slugValue}
            onChange={(e) => setSlugValue(e.target.value)}
            className={styles.input}
            placeholder="project-slug (used in URL)"
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? 'Creating…' : 'Create project'}
        </button>
      </form>
    </div>
  )
}
