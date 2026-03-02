import styles from './Navbar.module.css'
import { NavPill } from './NavPill'
import { RiveLogoButton } from './RiveLogoButton'

export function Navbar() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <nav className={styles.nav} aria-label="Primary">
          <div className={styles.navInner}>
            <NavPill to="/" ariaLabel="Home" end>
              <RiveLogoButton />
            </NavPill>

            <NavPill to="/projects">Projects</NavPill>
            <NavPill to="/archive">Archive</NavPill>
            <NavPill to="/about">About</NavPill>
            <NavPill to="/contact">Contact</NavPill>
          </div>
        </nav>
      </div>
    </header>
  )
}
