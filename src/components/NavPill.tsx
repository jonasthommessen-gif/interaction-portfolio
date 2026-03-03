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
  /** Override ripple end distance from center (px). Default uses CSS value (60px). */
  rippleEndPx?: number
  /** Nudge ripple origin horizontally (e.g. "-0.35em" to shift left). PROJECTS only. */
  rippleOriginX?: string
}

const RIPPLE_RADIUS_PX = 90

export function NavPill({ to, children, ariaLabel, end, onSamePageTap, rippleStartPx, rippleEndPx, rippleOriginX }: NavPillProps) {
  const match = useMatch({ path: to, end: end ?? (to === '/') })
  const isActive = !!match
  const isTextLabel = typeof children === 'string' || typeof children === 'number'
  const labelClassName = `${styles.label} ${
    isTextLabel ? styles.labelText : styles.labelIcon
  }${rippleOriginX != null ? ` ${styles.labelRippleOrigin}` : ''}`
  const labelStyle =
    rippleStartPx != null || rippleEndPx != null || rippleOriginX != null
      ? ({
          ...(rippleStartPx != null && { '--ripple-start': (rippleStartPx / RIPPLE_RADIUS_PX).toFixed(4) }),
          ...(rippleEndPx != null && { '--ripple-end': (rippleEndPx / RIPPLE_RADIUS_PX).toFixed(4) }),
          ...(rippleOriginX != null && { '--ripple-origin-x': rippleOriginX }),
        } as React.CSSProperties)
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
