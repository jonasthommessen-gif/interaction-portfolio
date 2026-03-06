import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import styles from './AdminPage.module.css'

export function AdminPage() {
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
        <span className={styles.email}>{session?.user?.email}</span>
        <button type="button" className={styles.signOut} onClick={handleSignOut}>
          Log out
        </button>
      </header>
      <p className={styles.placeholder}>Projects and Archive admin UI will go here.</p>
    </main>
  )
}
