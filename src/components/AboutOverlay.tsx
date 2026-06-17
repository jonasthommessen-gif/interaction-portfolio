import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './AboutOverlay.module.css'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { AdminTrigger } from './AdminTrigger'
import { AdminLoginModal } from './AdminLoginModal'
import { AboutPortraitCarousel } from './AboutPortraitCarousel'
import { AboutSkillsOrbit } from './AboutSkillsOrbit'
import { fetchSiteSettings } from '../lib/cms'
import type { SiteSettings } from '../lib/cms'
import {
  normalizeAboutBody,
  normalizeAboutPortraits,
  normalizeAboutSkills,
  normalizeAboutTitle,
} from '../lib/aboutContent'

type AboutOverlayProps = {
  showAdminLogin: boolean
  onOpenAdminLogin: () => void
  onCloseAdminLogin: () => void
}

const MOBILE_BREAKPOINT = '(max-width: 820px)'
const DEFAULT_PORTRAIT_SRC = '/images/placeholders/IMG_7240.JPG'

function resolvedSettings(raw: SiteSettings | null) {
  const legacySrc = raw?.about_portrait_src ?? null
  const legacyAlt = raw?.about_portrait_alt ?? null
  const portraits = normalizeAboutPortraits(raw?.about_portraits, legacySrc, legacyAlt)
  return {
    title: normalizeAboutTitle(raw?.about_title),
    body: normalizeAboutBody(raw?.about_body),
    portraits: portraits.length
      ? portraits
      : [{ src: DEFAULT_PORTRAIT_SRC, alt: '', order: 0 }],
    skills: normalizeAboutSkills(raw?.about_skills),
  }
}

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

function SkillsCarousel({ labels }: { labels: string[] }) {
  const segment = (
    <>
      {labels.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          {i > 0 && <span className={styles.carouselDot} aria-hidden>·</span>}
          <span>{word}</span>
        </Fragment>
      ))}
      <span className={styles.carouselDot} aria-hidden>·</span>
    </>
  )

  return (
    <div className={styles.keywordsCarouselWrap} aria-hidden>
      <div className={styles.keywordsCarouselTrack}>
        <div className={styles.keywordsCarouselSegment}>{segment}</div>
        <div className={styles.keywordsCarouselSegment} aria-hidden>
          {segment}
        </div>
      </div>
    </div>
  )
}

export function AboutOverlay({ showAdminLogin, onOpenAdminLogin, onCloseAdminLogin }: AboutOverlayProps) {
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null)
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT)
  const navigate = useNavigate()

  useEffect(() => {
    fetchSiteSettings().then(setSiteSettings)
  }, [])

  const content = useMemo(() => resolvedSettings(siteSettings), [siteSettings])
  const skillLabels = useMemo(() => content.skills.map((s) => s.label), [content.skills])

  return (
    <>
      <div className={styles.leftColumn}>
        <div className={styles.snapPanel}>
          <section className={`${styles.section} ${styles.sectionFirstCard}`} aria-label="About">
            <header className={styles.topSeparator}>
              <div className={styles.topSeparatorLine} aria-hidden>
                <div className={styles.lineSegment} />
                <span className={styles.lineHeadGlyph}>
                  <img src="/Other/Name.glyph.svg" alt="" width="47" height="46" aria-hidden />
                </span>
                <span className={styles.nameGap} />
                <h1 className={styles.name}>
                  <AdminTrigger onTrigger={onOpenAdminLogin}>JONAS THOMMESSEN</AdminTrigger>
                </h1>
                <span className={styles.nameGap} />
                <span className={styles.lineHeadGlyph}>
                  <img src="/Other/Name.glyph.svg" alt="" width="47" height="46" aria-hidden />
                </span>
                <div className={styles.lineSegment} />
              </div>
            </header>
            <div className={styles.separatorGapBlock}>
              <div className={styles.textBlockCentered}>
                <h2 className={styles.title}>
                  <AdminTrigger onTrigger={onOpenAdminLogin}>{content.title}</AdminTrigger>
                </h2>
                <div className={styles.bioText}>
                  {content.body.map((para) => (
                    <p key={para.slice(0, 32)}>{para}</p>
                  ))}
                  <p className={styles.location}>Based in Norway</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className={styles.snapPanel}>
          <section className={`${styles.section} ${styles.sectionSnapStart} ${styles.sectionPanel2}`} aria-label="Skills">
            <div className={styles.separatorLineWrapper} aria-hidden>
              <div className={styles.separatorLine} />
            </div>
            <div className={`${styles.separatorGapCell} ${styles.separatorGapCellBetweenSeparators}`} aria-hidden>
              {isMobile ? (
                <SkillsCarousel labels={skillLabels} />
              ) : (
                <div className={styles.keywordsSection1}>
                  <AboutSkillsOrbit skills={content.skills} />
                </div>
              )}
            </div>
            <div className={styles.separatorLineWrapper} aria-hidden>
              <div className={styles.separatorLine} />
            </div>
          </section>
        </div>

        <div className={styles.snapPanel}>
          <section className={`${styles.section} ${styles.sectionSnapStart}`} aria-label="Skills continued">
            <div className={styles.separatorLineWrapper} aria-hidden>
              <div className={styles.separatorLine} />
            </div>
            <div className={styles.separatorGapCell} aria-hidden />
          </section>
        </div>
      </div>

      <aside className={styles.rightPanel}>
        <div className={styles.imageBlock}>
          <div className={styles.imageWrap}>
            <AboutPortraitCarousel
              portraits={content.portraits.map((p) => ({ src: p.src, alt: p.alt }))}
              enableSwipe={isMobile}
            />
          </div>
        </div>
        <div className={styles.contactBlock}>
          <h2 className={styles.contactHeading}>How to reach me</h2>
          <ul className={styles.contactList}>
            <li>
              <a href="https://www.linkedin.com/in/jonasthommessen" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                <span className={styles.contactIcon}><IconLinkedIn /></span>
                Jonas Thommessen
                <span className="srOnly">Opens in new window</span>
              </a>
            </li>
            <li>
              <a href="https://www.instagram.com/jonasthommessen" target="_blank" rel="noopener noreferrer" className={styles.contactLink}>
                <span className={styles.contactIcon}><IconInstagram /></span>
                @jonasthommessen
                <span className="srOnly">Opens in new window</span>
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
      {showAdminLogin && (
        <AdminLoginModal
          onClose={onCloseAdminLogin}
          onSuccess={() => {
            onCloseAdminLogin()
            navigate('/admin')
          }}
        />
      )}
    </>
  )
}
