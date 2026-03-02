import type { ReactNode } from 'react'
import { NavLink, useMatch } from 'react-router-dom'
import styles from './NavPill.module.css'

type NavPillProps = {
  to: string
  children: ReactNode
  ariaLabel?: string
  end?: boolean
  /** When provided and user taps this link while already on this route, called instead of navigating (e.g. collapse mobile nav) */
  onSamePageTap?: () => void
}

export function NavPill({ to, children, ariaLabel, end, onSamePageTap }: NavPillProps) {
  const match = useMatch({ path: to, end: end ?? (to === '/') })
  const isActive = !!match
  const isTextLabel = typeof children === 'string' || typeof children === 'number'
  const labelClassName = `${styles.label} ${
    isTextLabel ? styles.labelText : styles.labelIcon
  }`

  return (
    <NavLink
      to={to}
      end={end}
      aria-label={ariaLabel}
      className={`${styles.pill} ${isActive ? styles.pillActive : ''}`}
      onClick={(e) => {
        if (isActive && onSamePageTap) {
          e.preventDefault()
          onSamePageTap()
        }
      }}
    >
      <span className={labelClassName}>
        <span className={styles.wave} aria-hidden="true" />
        <span className={styles.labelContent}>{children}</span>
      </span>
    </NavLink>
  )
}
