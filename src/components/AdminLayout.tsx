import { useEffect, useState, Suspense } from 'react'
import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import styles from './AdminLayout.module.css'

export function AdminLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s ?? null)
      setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null))
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase?.auth.signOut()
    navigate('/about')
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <p className={styles.message}>Loading…</p>
      </main>
    )
  }

  if (!session) {
    return (
      <main className={styles.page}>
        <p className={styles.message}>Not logged in.</p>
        <p className={styles.hint}>Go to the About page and hold or hover on the name for 10 seconds to open the login.</p>
        <button type="button" className={styles.linkButton} onClick={() => navigate('/about')}>
          Go to About
        </button>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Portfolio admin</h1>
        <nav className={styles.nav} aria-label="Admin">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            Dashboard
          </NavLink>
          <NavLink to="/admin/projects" className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            Projects
          </NavLink>
          <NavLink to="/admin/archive" className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            Archive
          </NavLink>
          <NavLink to="/admin/about" className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}>
            About
          </NavLink>
        </nav>
        <span className={styles.email}>{session.user?.email}</span>
        <button type="button" className={styles.signOut} onClick={handleSignOut}>
          Log out
        </button>
      </header>
      <div className={styles.content}>
        <Suspense fallback={<p className={styles.message}>Loading…</p>}>
          <Outlet />
        </Suspense>
      </div>
    </main>
  )
}
