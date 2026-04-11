import type { SectionContent, SectionLayoutKey, SectionSideInfo } from '../types/cms'
import styles from './SectionBlock.module.css'

const LAYOUTS_WITH_SIDE_INFO: SectionLayoutKey[] = ['media-above-text', 'full-bleed-media']

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
  if (info.collaborators?.some((c) => t(c.logoSrc) && t(c.logoAlt))) return true
  return false
}

function sideInfoActive(layout: SectionLayoutKey, content: SectionContent | undefined): boolean {
  if (!content?.display?.showSideInfo) return false
  if (!LAYOUTS_WITH_SIDE_INFO.includes(layout)) return false
  return hasSideInfoData(content.sideInfo)
}

function formatParticipants(raw: string) {
  const lines = raw
    .split(/\n/)
    .map((x) => x.trim())
    .filter(Boolean)
  if (lines.length > 1) {
    return (
      <ul className={styles.sideInfoList}>
        {lines.map((line, i) => (
          <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
        ))}
      </ul>
    )
  }
  const parts = raw
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean)
  if (parts.length > 1) {
    return (
      <ul className={styles.sideInfoList}>
        {parts.map((p, i) => (
          <li key={`${i}-${p.slice(0, 24)}`}>{p}</li>
        ))}
      </ul>
    )
  }
  return <p className={styles.sideInfoValue}>{raw.trim()}</p>
}

function SideInfoPanel({ info }: { info: SectionSideInfo }) {
  const collaborators = (info.collaborators ?? []).filter(
    (c) => c.logoSrc?.trim() && c.logoAlt?.trim(),
  )
  const links = (info.links ?? []).filter((l) => l.label?.trim() && l.href?.trim())

  const showFactsDl = Boolean(
    info.timeframe?.trim() ||
      info.role?.trim() ||
      info.location?.trim() ||
      info.tools?.trim() ||
      info.methods?.trim() ||
      info.participants?.trim(),
  )

  return (
    <aside className={styles.sideInfo} aria-label="Project facts">
      {info.overview?.trim() ? (
        <p className={styles.sideInfoOverview}>{info.overview.trim()}</p>
      ) : null}

      {showFactsDl ? (
        <dl className={styles.sideInfoDl}>
          {info.timeframe?.trim() ? (
            <div className={styles.sideInfoPair}>
              <dt className={styles.sideInfoLabel}>Timeframe</dt>
              <dd className={styles.sideInfoValue}>{info.timeframe.trim()}</dd>
            </div>
          ) : null}
          {info.role?.trim() ? (
            <div className={styles.sideInfoPair}>
              <dt className={styles.sideInfoLabel}>Role</dt>
              <dd className={styles.sideInfoValue}>{info.role.trim()}</dd>
            </div>
          ) : null}
          {info.location?.trim() ? (
            <div className={styles.sideInfoPair}>
              <dt className={styles.sideInfoLabel}>Location</dt>
              <dd className={styles.sideInfoValue}>{info.location.trim()}</dd>
            </div>
          ) : null}
          {info.tools?.trim() ? (
            <div className={styles.sideInfoPair}>
              <dt className={styles.sideInfoLabel}>Tools</dt>
              <dd className={styles.sideInfoValue}>{info.tools.trim()}</dd>
            </div>
          ) : null}
          {info.methods?.trim() ? (
            <div className={styles.sideInfoPair}>
              <dt className={styles.sideInfoLabel}>Methods</dt>
              <dd className={styles.sideInfoValue}>{info.methods.trim()}</dd>
            </div>
          ) : null}
          {info.participants?.trim() ? (
            <div className={styles.sideInfoPair}>
              <dt className={styles.sideInfoLabel}>Participants</dt>
              <dd>{formatParticipants(info.participants)}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {collaborators.length > 0 ? (
        <div className={styles.sideInfoPair}>
          <div className={styles.sideInfoLabel}>Collaboration</div>
          <div className={styles.sideInfoPartners}>
            {collaborators.map((c, i) => {
              const inner = (
                <>
                  <img src={c.logoSrc.trim()} alt={c.logoAlt.trim()} loading="lazy" decoding="async" />
                  {c.name?.trim() ? <span className={styles.sideInfoValue}>{c.name.trim()}</span> : null}
                </>
              )
              return (
                <div key={`${c.logoSrc}-${i}`} className={styles.sideInfoPartner}>
                  {c.url?.trim() ? (
                    <a href={c.url.trim()} rel="noopener noreferrer" target="_blank">
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {links.length > 0 ? (
        <div className={styles.sideInfoPair}>
          <div className={styles.sideInfoLabel}>Links</div>
          <div className={styles.sideInfoLinks}>
            {links.map((l, i) => (
              <a key={`${l.href}-${i}`} href={l.href.trim()} rel="noopener noreferrer" target="_blank">
                {l.label.trim()}
              </a>
            ))}
          </div>
        </div>
      ) : null}
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

  if (layout === 'full-bleed-media') {
    const showCaption =
      hasText ||
      (showTitleWithText && !pureSingleMediaBlock) ||
      (!hasSingleMedia && !hasText)

    const sideOn = sideInfoActive(layout, content)
    const sideInfoNode =
      sideOn && content?.sideInfo ? <SideInfoPanel info={content.sideInfo} /> : null

    const captionMain = (
      <>
        <SectionTitle label={sectionLabel} visible={showTitleWithText} />
        <ContentHeading text={headingStr} />
        {hasBody ? <div className={styles.body}>{bodyStr}</div> : null}
        {!hasBody && !hasHeading && !showTitleWithText ? (
          <p className={styles.placeholder}>
            {!hasSingleMedia ? 'Add media and text in admin.' : 'Add content in admin.'}
          </p>
        ) : null}
      </>
    )

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
          <div className={`${styles.caption} ${sideOn ? styles.captionWide : ''}`}>
            {sideOn ? (
              <div className={styles.postHeroRow}>
                <div className={styles.postHeroRowMain}>{captionMain}</div>
                {sideInfoNode}
              </div>
            ) : (
              captionMain
            )}
          </div>
        ) : sideInfoNode ? (
          <div className={styles.sideInfoStandalone}>{sideInfoNode}</div>
        ) : null}
      </div>
    )
  }

  if (layout === 'media-above-text') {
    const showTextBlock =
      hasText || (showTitleWithText && !pureSingleMediaBlock) || !hasSingleMedia

    const sideOn = sideInfoActive(layout, content)
    const sideInfoNode =
      sideOn && content?.sideInfo ? <SideInfoPanel info={content.sideInfo} /> : null

    const textMain = (
      <>
        <SectionTitle label={sectionLabel} visible={showTitleWithText && !pureSingleMediaBlock} />
        <ContentHeading text={headingStr} />
        {hasBody ? (
          <div className={styles.body}>{bodyStr}</div>
        ) : (
          <p className={styles.placeholder}>
            {hasSingleMedia ? 'Add body text in admin.' : 'Add content in admin.'}
          </p>
        )}
      </>
    )

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
          sideOn ? (
            <div className={styles.postHeroRow}>
              <div className={styles.postHeroRowMain}>{textMain}</div>
              {sideInfoNode}
            </div>
          ) : (
            <div className={styles.textBlock}>{textMain}</div>
          )
        ) : sideInfoNode ? (
          <div className={styles.sideInfoStandalone}>{sideInfoNode}</div>
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
