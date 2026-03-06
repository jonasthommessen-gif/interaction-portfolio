import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './Navbar.module.css'
import { NavPill } from './NavPill'
import { RiveLogoButton } from './RiveLogoButton'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useNavbarInvert } from '../contexts/NavbarInvertContext'

const MOBILE_BREAKPOINT = '(max-width: 820px)'

export function Navbar() {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)
  const { invertLogo } = useNavbarInvert()
  const [isMobileNavExpanded, setIsMobileNavExpanded] = useState(false)
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const wasExpandedRef = useRef(false)

  const isHome = location.pathname === '/'
  const effectiveExpanded = (isMobile && isHome) || isMobileNavExpanded

  useFocusTrap(navRef, isMobile && effectiveExpanded)

  useEffect(() => {
    if (isMobile) return
    setIsMobileNavExpanded(false)
  }, [isMobile])

  useEffect(() => {
    setIsMobileNavExpanded(false)
  }, [location.pathname])

  // Tap outside expanded nav to contract (mobile); do not close when on home
  useEffect(() => {
    if (!isMobile || !isMobileNavExpanded) return
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (location.pathname === '/') return
      const target = e.target as Node
      if (navRef.current && !navRef.current.contains(target)) {
        setIsMobileNavExpanded(false)
      }
    }
    const rafId = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handlePointer)
      document.addEventListener('touchstart', handlePointer, { passive: true })
    })
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
    }
  }, [isMobile, isMobileNavExpanded, location.pathname])

  // Return focus to Open menu button when collapsing (button re-mounts on collapse)
  useEffect(() => {
    if (wasExpandedRef.current && !isMobileNavExpanded) {
      menuButtonRef.current?.focus()
      wasExpandedRef.current = false
    }
    if (isMobileNavExpanded) wasExpandedRef.current = true
  }, [isMobileNavExpanded])

  const showCollapsed = isMobile && !effectiveExpanded

  return (
    <header
      className={styles.header}
      data-expanded={isMobile ? effectiveExpanded : undefined}
    >
      <div className={`container ${styles.inner}`}>
        <nav
          ref={navRef}
          className={styles.nav}
          aria-label="Primary"
          data-expanded={isMobile ? effectiveExpanded : undefined}
          data-home-nav={isMobile && isHome ? 'true' : undefined}
        >
          <div className={styles.navInner}>
            {showCollapsed ? (
              <button
                ref={menuButtonRef}
                type="button"
                className={styles.logoOnlyBtn}
                onClick={() => setIsMobileNavExpanded(true)}
                aria-label="Open menu"
              >
                <span className={styles.logoOnlyIcon}>
                  <RiveLogoButton contracted invert={showCollapsed && invertLogo} />
                </span>
              </button>
            ) : (
              <>
                <NavPill
                  to="/"
                  ariaLabel="Home"
                  end
                  onSamePageTap={isMobile ? () => setIsMobileNavExpanded(false) : undefined}
                >
                  <RiveLogoButton />
                </NavPill>
                <NavPill
                  to="/projects"
                  rippleStartPx={54}
                  rippleEndPx={65}
                  rippleOriginX="-0.35em"
                  onSamePageTap={isMobile ? () => setIsMobileNavExpanded(false) : undefined}
                >
                  Projects
                </NavPill>
                <NavPill
                  to="/archive"
                  onSamePageTap={isMobile ? () => setIsMobileNavExpanded(false) : undefined}
                >
                  Archive
                </NavPill>
                <NavPill
                  to="/about"
                  onSamePageTap={isMobile ? () => setIsMobileNavExpanded(false) : undefined}
                >
                  About
                </NavPill>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
