import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './AdminLoginModal.module.css'

type AdminLoginModalProps = {
  onClose: () => void
  onSuccess: () => void
}

export function AdminLoginModal({ onClose, onSuccess }: AdminLoginModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const firstInput = formRef.current?.querySelector<HTMLInputElement>('input')
    firstInput?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!supabase) {
      setError('Admin login is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env')
      return
    }
    setLoading(true)
    try {
      const { error: signError } = await supabase.auth.signInWithPassword({ email, password })
      if (signError) {
        setError(signError.message)
        return
      }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Enter your email above, then click Forgot password.')
      return
    }
    if (!supabase) {
      setError('Admin login is not configured.')
      return
    }
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin`,
      })
      if (resetError) {
        setError(resetError.message)
        return
      }
      setForgotSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={styles.card}>
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 id="admin-login-title" className={styles.title}>
          Admin
        </h2>
        {forgotSent ? (
          <p className={styles.message}>
            Check your email for a link to reset your password.
          </p>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
            <label htmlFor="admin-email" className={styles.label}>
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
            />
            <label htmlFor="admin-password" className={styles.label}>
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
            />
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.actions}>
              <button type="submit" className={styles.submit} disabled={loading}>
                {loading ? 'Signing in…' : 'Log in'}
              </button>
              <button
                type="button"
                className={styles.forgot}
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
