import { Link } from 'react-router-dom'
import styles from './AdminDashboardPage.module.css'

export function AdminDashboardPage() {
  return (
    <div className={styles.dashboard}>
      <h2 className={styles.heading}>Dashboard</h2>
      <div className={styles.cards}>
        <Link to="/admin/projects" className={styles.card}>
          <span className={styles.cardTitle}>Projects</span>
          <span className={styles.cardDesc}>Edit case studies, visibility, order, and sections.</span>
        </Link>
        <Link to="/admin/archive" className={styles.card}>
          <span className={styles.cardTitle}>Archive</span>
          <span className={styles.cardDesc}>Add and edit archive posts (photos, videos, tags).</span>
        </Link>
      </div>
    </div>
  )
}
