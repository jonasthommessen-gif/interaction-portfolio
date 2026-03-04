import { useState } from 'react'
import styles from './AboutOverlay.module.css'

const IconLinkedIn = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.25 6.5 1.76 1.76 0 016.5 8.25zM19 19h-3v-4.74c0-1.13-.02-2.58-1.57-2.58-1.57 0-1.81 1.23-1.81 2.5V19h-3v-9h2.87v1.3h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6V19z" fill="currentColor" />
  </svg>
)

const IconInstagram = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 2.16c3.2 0 3.58 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.05 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.05-1.65.07-4.85.07s-3.58 0-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.05-1.27-.07-1.65-.07-4.85s0-3.58.07-4.85c.15-3.24 1.7-4.77 4.92-4.92 1.27-.05 1.65-.07 4.85-.07zM12 0C8.74 0 8.33 0 7.05.07 2.7.27.27 2.69.07 7.05 0 8.33 0 8.74 0 12s0 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 24 8.74 24 12 24s3.67 0 4.95-.07c4.36-.2 6.78-2.62 6.98-6.98.05-1.28.07-1.69.07-4.95s0-3.67-.07-4.95C23.73 2.7 21.31.27 16.95.07 15.67 0 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.41-11.37a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" fill="currentColor" />
  </svg>
)

const IconMail = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor" />
  </svg>
)

export function AboutOverlay() {
  const [portraitError, setPortraitError] = useState(false)

  return (
    <div className={styles.overlay}>
      <div className={styles.layout}>
        {/* Left column: name, title, bio, skills diagram */}
        <section className={styles.leftColumn} aria-label="About">
          <header className={styles.header}>
            <div className={styles.headerLineLeft} />
            <div className={styles.headerChevron} aria-hidden />
            <h1 className={styles.name}>JONAS THOMMESSEN</h1>
            <div className={styles.headerLineRight} aria-hidden />
          </header>

          <div className={styles.bioBlock}>
            <h2 className={styles.title}>Interaction & product designer</h2>
            <div className={styles.bioText}>
              <p>
                I work across strategy and interaction design, focusing on making complexity navigable.
              </p>
              <p>
                Interfaces don&apos;t exist on their own. They&apos;re shaped by context, limitations, and the way people make sense of what they see. My practice is about clarifying those relationships, making information frictionless to navigate and decisions easier to understand.
              </p>
              <p>Based in Norway</p>
            </div>
          </div>

          <div className={styles.diagramSection}>
            <div className={styles.diagramLine} aria-hidden />
            <div className={styles.diagram}>
              <div className={styles.diagramLabels}>
                <span className={styles.diagramLabelTop}>Systems thinking</span>
                <span className={styles.diagramLabelRight}>Products</span>
                <span className={styles.diagramLabelBottomRight}>UI</span>
                <span className={styles.diagramLabelBottomLeft}>Motion</span>
                <span className={styles.diagramLabelLeft}>Prototyping</span>
                <span className={styles.diagramLabelTopLeft}>UX</span>
              </div>
              <div className={styles.diagramConnectors} aria-hidden />
              <div className={styles.diagramPill}>
                <span>INTERACTION DESIGNER</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right column: vertical rule, portrait, contact */}
        <aside className={styles.rightColumn}>
          <div className={styles.verticalRule} aria-hidden />
          <div className={styles.cornerOrnaments} aria-hidden />

          <div className={styles.portraitBlock}>
            <div className={styles.portraitFrame}>
              <div className={styles.portraitLineTop} />
              <div className={styles.portraitImageWrap}>
                {!portraitError && (
                  <img
                    src="/about-portrait.jpg"
                    alt=""
                    className={styles.portraitImage}
                    onError={() => setPortraitError(true)}
                  />
                )}
              </div>
              <div className={styles.portraitLineBottom} />
            </div>
          </div>

          <div className={styles.contactBlock}>
            <h2 className={styles.contactHeading}>How to reach me</h2>
            <ul className={styles.contactList}>
              <li>
                <a href="https://www.linkedin.com/in/jonasthommessen" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                  <span className={styles.contactIcon}><IconLinkedIn /></span>
                  Jonas Thommessen
                </a>
              </li>
              <li>
                <a href="https://www.instagram.com/jonasthommessen" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                  <span className={styles.contactIcon}><IconInstagram /></span>
                  @jonasthommessen
                </a>
              </li>
              <li>
                <a href="mailto:jonas.thommessen@icloud.com" className={styles.contactLink}>
                  <span className={styles.contactIcon}><IconMail /></span>
                  jonas.thommessen@icloud.com
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
