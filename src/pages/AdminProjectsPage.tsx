import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProjects } from '../lib/cms'
import type { Project } from '../types/cms'
import styles from './AdminProjectsPage.module.css'

export function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
      .then((data) => setProjects(data.sort((a, b) => a.order - b.order)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className={styles.message}>Loading projects…</p>
  if (error) return <p className={styles.error}>{error}</p>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Projects</h2>
        <p className={styles.hint}>Edit visibility, order, and sections from each project’s edit page.</p>
        <Link to="/admin/projects/new" className={styles.newLink}>+ New project</Link>
      </div>
      <ul className={styles.list}>
        {projects.map((p, i) => (
          <li key={p.slug} className={styles.item}>
            <span className={styles.order}>{i + 1}</span>
            <span className={styles.visible}>{p.visible ? 'Visible' : 'Hidden'}</span>
            <span className={styles.title}>{p.title}</span>
            <span className={styles.slug}>{p.slug}</span>
            <Link to={`/admin/projects/edit/${p.slug}`} className={styles.edit}>
              Edit
            </Link>
            <Link to={`/projects/${p.slug}`} className={styles.view} target="_blank" rel="noopener noreferrer">
              View
            </Link>
          </li>
        ))}
      </ul>
      {projects.length === 0 && <p className={styles.empty}>No projects yet. Run the Supabase migration and add projects, or you see static content.</p>}
    </div>
  )
}
