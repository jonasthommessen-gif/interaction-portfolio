import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import styles from './NavPill.module.css'

type NavPillProps = {
  to: string
  children: ReactNode
  ariaLabel?: string
  end?: boolean
}

export function NavPill({ to, children, ariaLabel, end }: NavPillProps) {
  const isTextLabel = typeof children === 'string' || typeof children === 'number'
  const labelClassName = `${styles.label} ${
    isTextLabel ? styles.labelText : styles.labelIcon
  }`

  return (
    <NavLink
      to={to}
      end={end}
      aria-label={ariaLabel}
      className={({ isActive }) =>
        `${styles.pill} ${isActive ? styles.pillActive : ''}`
      }
    >
      <span className={labelClassName}>
        <span className={styles.wave} aria-hidden="true" />
        <span className={styles.labelContent}>{children}</span>
      </span>
    </NavLink>
  )
}
