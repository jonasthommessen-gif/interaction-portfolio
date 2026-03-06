import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchArchiveProjects } from '../lib/cms'
import type { ArchiveProject } from '../types/cms'
import styles from './AdminArchivePage.module.css'

export function AdminArchivePage() {
  const [posts, setPosts] = useState<ArchiveProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchArchiveProjects()
      .then(setPosts)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className={styles.message}>Loading archive…</p>
  if (error) return <p className={styles.error}>{error}</p>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Archive</h2>
        <p className={styles.hint}>Instagram-style posts with photos and videos.</p>
        <Link to="/admin/archive/new" className={styles.newLink}>+ New post</Link>
      </div>
      <ul className={styles.list}>
        {posts.map((p) => (
          <li key={p.id} className={styles.item}>
            {p.cover && (
              <span className={styles.thumb}>
                <img src={p.cover} alt="" width={48} height={48} />
              </span>
            )}
            <span className={styles.title}>{p.title}</span>
            <span className={styles.meta}>{p.tags?.slice(0, 2).join(', ')}</span>
          </li>
        ))}
      </ul>
      {posts.length === 0 && <p className={styles.empty}>No archive posts yet. Run the Supabase migration to add posts.</p>}
    </div>
  )
}
