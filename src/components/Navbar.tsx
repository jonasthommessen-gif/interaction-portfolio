import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './Navbar.module.css'
import { NavPill } from './NavPill'
import { RiveLogoButton } from './RiveLogoButton'
import { useMediaQuery } from '../hooks/useMediaQuery'

const MOBILE_BREAKPOINT = '(max-width: 820px)'

export function Navbar() {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)
  const [isMobileNavExpanded, setIsMobileNavExpanded] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (isMobile) return
    setIsMobileNavExpanded(false)
  }, [isMobile])

  useEffect(() => {
    setIsMobileNavExpanded(false)
  }, [location.pathname])

  const showCollapsed = isMobile && !isMobileNavExpanded

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <nav className={styles.nav} aria-label="Primary" data-expanded={isMobile ? isMobileNavExpanded : undefined}>
          <div className={styles.navInner}>
            {showCollapsed ? (
              <button
                type="button"
                className={styles.logoOnlyBtn}
                onClick={() => setIsMobileNavExpanded(true)}
                aria-label="Open menu"
              >
                <span className={styles.logoOnlyIcon}>
                  <RiveLogoButton />
                </span>
              </button>
            ) : (
              <>
                <NavPill to="/" ariaLabel="Home" end>
                  <RiveLogoButton />
                </NavPill>
                <NavPill to="/projects">Projects</NavPill>
                <NavPill to="/archive">Archive</NavPill>
                <NavPill to="/about">About</NavPill>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
