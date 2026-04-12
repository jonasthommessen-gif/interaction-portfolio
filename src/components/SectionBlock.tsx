import type {
  SectionContent,
  SectionLayoutKey,
  SectionSideInfo,
  SectionSideInfoCollaborator,
} from '../types/cms'
import styles from './SectionBlock.module.css'

function hasSideInfoData(info: SectionSideInfo | undefined): boolean {
  if (!info) return false
  const t = (s?: string) => Boolean(s?.trim())
  if (t(info.overview)) return true
  if (t(info.timeframe)) return true
  if (t(info.participants)) return true
  if (t(info.role)) return true
  if (t(info.tools)) return true
  if (t(info.methods)) return true
  if (t(info.location)) return true
  if (info.links?.some((l) => t(l.label) && t(l.href))) return true
  if (
    info.collaborators?.some(
      (c) =>
        Boolean(c.logo?.src?.trim()) ||
        (Boolean(c.logoSrc?.trim()) && Boolean(c.logoAlt?.trim())) ||
        Boolean(c.name?.trim()),
    )
  )
    return true
  return false
}

function collaboratorLogoSrc(c: SectionSideInfoCollaborator): string | null {
  const fromAsset = c.logo?.src?.trim()
  if (fromAsset) return fromAsset
  const legacy = c.logoSrc?.trim()
  return legacy || null
}

function collaboratorLogoAlt(c: SectionSideInfoCollaborator): string {
  return (c.logo?.alt ?? c.logoAlt ?? '').trim()
}

function participantsOneLine(raw: string): string {
  return raw
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ')
}

function OverviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.overviewRow}>
      <span className={styles.overviewLabel}>{label}</span>
      <span className={styles.overviewValue}>{children}</span>
    </div>
  )
}

function OverviewFactsPanel({ info }: { info: SectionSideInfo }) {
  const collaborators = (info.collaborators ?? []).filter((c) => {
    if (collaboratorLogoSrc(c)) return true
    return Boolean(c.name?.trim())
  })
  const collaboratorsWithLogo = (info.collaborators ?? []).filter((c) =>
    Boolean(collaboratorLogoSrc(c)),
  )
  const links = (info.links ?? []).filter((l) => l.label?.trim() && l.href?.trim())
  const hasAside = collaboratorsWithLogo.length > 0

  return (
    <aside
      className={hasAside ? `${styles.overviewFacts} ${styles.overviewFactsWithAside}` : styles.overviewFacts}
      aria-label="Project overview"
    >
      <div className={hasAside ? `${styles.overviewLayout} ${styles.overviewLayoutWithAside}` : styles.overviewLayout}>
        <div className={styles.overviewMain}>
          {info.overview?.trim() ? <p className={styles.overviewLead}>{info.overview.trim()}</p> : null}

          {info.timeframe?.trim() ? (
            <OverviewRow label="Timeframe">{info.timeframe.trim()}</OverviewRow>
          ) : null}
          {info.role?.trim() ? <OverviewRow label="Role">{info.role.trim()}</OverviewRow> : null}
          {info.location?.trim() ? (
            <OverviewRow label="Location">{info.location.trim()}</OverviewRow>
          ) : null}
          {info.participants?.trim() ? (
            <OverviewRow label="Participants">{participantsOneLine(info.participants)}</OverviewRow>
          ) : null}
          {info.tools?.trim() ? <OverviewRow label="Tools">{info.tools.trim()}</OverviewRow> : null}
          {info.methods?.trim() ? <OverviewRow label="Methods">{info.methods.trim()}</OverviewRow> : null}

          {collaborators.map((c, i) => {
            const src = collaboratorLogoSrc(c)
            const name = c.name?.trim() ?? ''
            const nameNode = c.url?.trim() ? (
              <a href={c.url.trim()} rel="noopener noreferrer" target="_blank" className={styles.overviewCollabName}>
                {name || 'Website'}
              </a>
            ) : name ? (
              <span className={styles.overviewCollabName}>{name}</span>
            ) : null
            const valueCell = nameNode ?? (src ? <span className={styles.overviewValueMuted} aria-hidden="true" /> : null)
            if (!nameNode && !src) return null

            return (
              <div key={`collab-${i}-${src ?? (name || String(i))}`} className={styles.overviewRow}>
                <span className={styles.overviewLabel}>In collaboration with</span>
                <span className={styles.overviewValue}>{valueCell}</span>
              </div>
            )
          })}

          {links.map((l, i) => (
            <OverviewRow key={`${l.href}-${i}`} label="Link">
              <a href={l.href.trim()} rel="noopener noreferrer" target="_blank" className={styles.overviewLink}>
                {l.label.trim()}
              </a>
            </OverviewRow>
          ))}
        </div>

        {hasAside ? (
          <div className={styles.overviewAside} aria-label="Partner logos">
            {collaboratorsWithLogo.map((c, i) => {
              const src = collaboratorLogoSrc(c)!
              const alt = collaboratorLogoAlt(c) || 'Partner logo'
              const img = (
                <img
                  src={src}
                  alt={alt}
                  className={styles.overviewAsideLogo}
                  loading="lazy"
                  decoding="async"
                />
              )
              return c.url?.trim() ? (
                <a
                  key={`aside-logo-${i}-${src}`}
                  href={c.url.trim()}
                  rel="noopener noreferrer"
                  target="_blank"
                  className={styles.overviewAsideLink}
                >
                  {img}
                </a>
              ) : (
                <div key={`aside-logo-${i}-${src}`} className={styles.overviewAsideFigure}>
                  {img}
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </aside>
  )
}

type Props = {
  layout: SectionLayoutKey
  content?: SectionContent
  /** Sidebar / nav label; in-content visibility controlled by `content.display`. */
  sectionLabel: string
  /** First section’s hero image may load eagerly. */
  imageLoading?: 'eager' | 'lazy'
}

const defaultObjectPosition = '50% 50%'

function trimText(s: string | undefined) {
  return s?.trim() ?? ''
}

function MediaBlock({
  media,
  variant,
  loading,
}: {
  media: SectionContent['media']
  variant: 'default' | 'hero'
  loading?: 'eager' | 'lazy'
}) {
  if (!media?.src) return null
  const positionStyle: React.CSSProperties = {
    objectPosition: media.objectPosition ?? defaultObjectPosition,
  }
  const wrapClass = variant === 'hero' ? `${styles.mediaWrap} ${styles.mediaWrapHero}` : styles.mediaWrap
  const mediaClass = variant === 'hero' ? `${styles.media} ${styles.mediaHero}` : styles.media

  if (media.type === 'video') {
    return (
      <div className={wrapClass}>
        <video
          src={media.src}
          poster={media.poster}
          controls
          playsInline
          className={mediaClass}
          style={positionStyle}
        />
      </div>
    )
  }
  return (
    <div className={wrapClass}>
      <img
        src={media.src}
        alt={media.alt ?? ''}
        className={mediaClass}
        style={positionStyle}
        loading={loading}
        decoding={loading === 'eager' ? 'sync' : 'async'}
      />
    </div>
  )
}

/** Main `media` on desktop; `mediaMobile` below 819px when both exist. */
function ResponsiveSingleMedia({
  media,
  mediaMobile,
  variant,
  loading,
}: {
  media: SectionContent['media']
  mediaMobile: SectionContent['mediaMobile']
  variant: 'default' | 'hero'
  loading?: 'eager' | 'lazy'
}) {
  const hasMain = Boolean(media?.src)
  const hasMobile = Boolean(mediaMobile?.src)
  if (!hasMain && !hasMobile) return null

  const usePair = hasMain && hasMobile

  if (!usePair) {
    return <MediaBlock media={media ?? mediaMobile} variant={variant} loading={loading} />
  }

  return (
    <>
      <div className={styles.mediaResponsiveDesktop}>
        <MediaBlock media={media} variant={variant} loading={loading} />
      </div>
      <div className={styles.mediaResponsiveMobile}>
        <MediaBlock media={mediaMobile} variant={variant} loading={loading} />
      </div>
    </>
  )
}

function SectionTitle({ label, visible }: { label: string; visible: boolean }) {
  if (!visible || !label.trim()) return null
  return <h2 className={styles.sectionHeading}>{label}</h2>
}

function ContentHeading({ text }: { text: string }) {
  if (!text) return null
  return <h3 className={styles.heading}>{text}</h3>
}

export function SectionBlock({ layout, content, sectionLabel, imageLoading = 'lazy' }: Props) {
  const bodyStr = trimText(content?.body)
  const headingStr = trimText(content?.heading)
  const hasBody = Boolean(bodyStr)
  const hasHeading = Boolean(headingStr)
  const hasText = hasBody || hasHeading
  const media = content?.media
  const mediaMobile = content?.mediaMobile
  const gallery = content?.gallery ?? []
  const showSectionTitle = content?.display?.showSectionTitle === true
  const sectionTitleAboveMedia = content?.display?.sectionTitleAboveMedia === true

  const hasSingleMedia = Boolean(media?.src || mediaMobile?.src)
  const hasGallery = gallery.length > 0

  const pureSingleMediaBlock = hasSingleMedia && !hasText
  const pureGalleryBlock = layout === 'gallery-strip' && hasGallery && !hasText

  const titleAboveMedia =
    showSectionTitle &&
    sectionTitleAboveMedia &&
    ((layout === 'media-above-text' && pureSingleMediaBlock) ||
      (layout === 'full-bleed-media' && pureSingleMediaBlock) ||
      (layout === 'gallery-strip' && pureGalleryBlock))

  const showTitleWithText = showSectionTitle && !titleAboveMedia

  if (layout === 'text-only') {
    return (
      <div className={styles.textOnly}>
        <SectionTitle label={sectionLabel} visible={showTitleWithText} />
        <ContentHeading text={headingStr} />
        {hasBody ? <div className={styles.body}>{bodyStr}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
      </div>
    )
  }

  if (layout === 'text-left-media-right') {
    return (
      <div className={styles.textLeftMediaRight}>
        <div className={styles.textBlock}>
          <SectionTitle label={sectionLabel} visible={showTitleWithText} />
          <ContentHeading text={headingStr} />
          {hasBody ? <div className={styles.body}>{bodyStr}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
        </div>
        <div className={styles.mediaColumn}>
          <ResponsiveSingleMedia
            media={media}
            mediaMobile={mediaMobile}
            variant="default"
            loading={imageLoading}
          />
        </div>
      </div>
    )
  }

  if (layout === 'media-left-text-right') {
    return (
      <div className={styles.mediaLeftTextRight}>
        <div className={styles.mediaColumn}>
          <ResponsiveSingleMedia
            media={media}
            mediaMobile={mediaMobile}
            variant="default"
            loading={imageLoading}
          />
        </div>
        <div className={styles.textBlock}>
          <SectionTitle label={sectionLabel} visible={showTitleWithText} />
          <ContentHeading text={headingStr} />
          {hasBody ? <div className={styles.body}>{bodyStr}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
        </div>
      </div>
    )
  }

  if (layout === 'project-overview') {
    const si = content?.sideInfo
    return (
      <div className={styles.projectOverview}>
        <SectionTitle label={sectionLabel} visible={showTitleWithText} />
        {hasSideInfoData(si) ? (
          <OverviewFactsPanel info={si!} />
        ) : (
          <p className={styles.placeholder}>Add overview facts in admin.</p>
        )}
      </div>
    )
  }

  if (layout === 'full-bleed-media') {
    const showCaption =
      hasText ||
      (showTitleWithText && !pureSingleMediaBlock) ||
      (!hasSingleMedia && !hasText)

    return (
      <div className={styles.fullBleedMedia}>
        <SectionTitle label={sectionLabel} visible={titleAboveMedia} />
        <div className={styles.mediaColumn}>
          <ResponsiveSingleMedia
            media={media}
            mediaMobile={mediaMobile}
            variant="hero"
            loading={imageLoading}
          />
        </div>
        {showCaption ? (
          <div className={styles.caption}>
            <SectionTitle label={sectionLabel} visible={showTitleWithText} />
            <ContentHeading text={headingStr} />
            {hasBody ? <div className={styles.body}>{bodyStr}</div> : null}
            {!hasBody && !hasHeading && !showTitleWithText ? (
              <p className={styles.placeholder}>
                {!hasSingleMedia ? 'Add media and text in admin.' : 'Add content in admin.'}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  if (layout === 'media-above-text') {
    const showTextBlock =
      hasText || (showTitleWithText && !pureSingleMediaBlock) || !hasSingleMedia

    return (
      <div className={styles.mediaAboveText}>
        <SectionTitle label={sectionLabel} visible={titleAboveMedia} />
        {hasSingleMedia ? (
          <div className={styles.mediaColumn}>
            <ResponsiveSingleMedia
              media={media}
              mediaMobile={mediaMobile}
              variant="hero"
              loading={imageLoading}
            />
          </div>
        ) : null}
        {showTextBlock ? (
          <div className={styles.textBlock}>
            <SectionTitle label={sectionLabel} visible={showTitleWithText && !pureSingleMediaBlock} />
            <ContentHeading text={headingStr} />
            {hasBody ? (
              <div className={styles.body}>{bodyStr}</div>
            ) : (
              <p className={styles.placeholder}>
                {hasSingleMedia ? 'Add body text in admin.' : 'Add content in admin.'}
              </p>
            )}
          </div>
        ) : null}
      </div>
    )
  }

  if (layout === 'gallery-strip') {
    const showTextAfter = hasText || (showTitleWithText && !pureGalleryBlock)

    return (
      <div className={styles.galleryStrip}>
        <SectionTitle label={sectionLabel} visible={titleAboveMedia} />
        {hasGallery ? (
          <div className={styles.gallery}>
            {gallery.map((item, i) => (
              <figure key={i} className={styles.galleryItem}>
                <img
                  src={item.src}
                  alt={item.alt ?? ''}
                  className={styles.galleryImg}
                  loading={imageLoading}
                />
                {item.caption && <figcaption className={styles.galleryCaption}>{item.caption}</figcaption>}
              </figure>
            ))}
          </div>
        ) : (
          <p className={styles.placeholder}>Add gallery images in admin.</p>
        )}
        {showTextAfter ? (
          <div className={styles.textBlock}>
            <SectionTitle label={sectionLabel} visible={showTitleWithText && !pureGalleryBlock} />
            <ContentHeading text={headingStr} />
            {hasBody ? <div className={styles.body}>{bodyStr}</div> : null}
            {!hasBody && !hasHeading && !showTitleWithText ? (
              <p className={styles.placeholder}>Add content in admin.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.textOnly}>
      {hasBody ? <div className={styles.body}>{bodyStr}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
    </div>
  )
}
