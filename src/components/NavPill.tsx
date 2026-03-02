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
  /** Override ripple start distance from center (px). Default uses CSS value (47px). */
  rippleStartPx?: number
}

const RIPPLE_RADIUS_PX = 90

export function NavPill({ to, children, ariaLabel, end, onSamePageTap, rippleStartPx }: NavPillProps) {
  const match = useMatch({ path: to, end: end ?? (to === '/') })
  const isActive = !!match
  const isTextLabel = typeof children === 'string' || typeof children === 'number'
  const labelClassName = `${styles.label} ${
    isTextLabel ? styles.labelText : styles.labelIcon
  }`
  const labelStyle =
    rippleStartPx != null
      ? ({ '--ripple-start': (rippleStartPx / RIPPLE_RADIUS_PX).toFixed(4) } as React.CSSProperties)
      : undefined

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
      <span className={labelClassName} style={labelStyle}>
        <span className={styles.wave} aria-hidden="true" />
        <span className={styles.labelContent}>{children}</span>
      </span>
    </NavLink>
  )
}
