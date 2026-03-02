import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import styles from './Navbar.module.css'
import { NavPill } from './NavPill'
import { RiveLogoButton } from './RiveLogoButton'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useNavbarInvert } from '../contexts/NavbarInvertContext'

const MOBILE_BREAKPOINT = '(max-width: 820px)'

export function Navbar() {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)
  const { invertLogo } = useNavbarInvert()
  const [isMobileNavExpanded, setIsMobileNavExpanded] = useState(false)
  const location = useLocation()
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (isMobile) return
    setIsMobileNavExpanded(false)
  }, [isMobile])

  useEffect(() => {
    setIsMobileNavExpanded(false)
  }, [location.pathname])

  // Tap outside expanded nav to contract (mobile)
  useEffect(() => {
    if (!isMobile || !isMobileNavExpanded) return
    const handlePointer = (e: MouseEvent | TouchEvent) => {
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
  }, [isMobile, isMobileNavExpanded])

  const showCollapsed = isMobile && !isMobileNavExpanded

  return (
    <header
      className={styles.header}
      data-expanded={isMobile ? isMobileNavExpanded : undefined}
    >
      <div className={`container ${styles.inner}`}>
        <nav ref={navRef} className={styles.nav} aria-label="Primary" data-expanded={isMobile ? isMobileNavExpanded : undefined}>
          <div className={styles.navInner}>
            {showCollapsed ? (
              <button
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
