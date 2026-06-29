import { useRef } from 'react'
import type {
  SectionContent,
  SectionLayoutKey,
  SectionSideInfo,
  SectionSideInfoAward,
  SectionSideInfoCollaborator,
  SectionSideInfoParticipant,
  SectionSubBlock,
} from '../types/cms'
import { formatSectionBody } from '../lib/formatSectionBody'
import { normalizeParticipants, participantsHasData } from '../lib/sectionParticipants'
import { VideoInView } from './VideoInView'
import { SectionCarousel } from './SectionCarousel'
import styles from './SectionBlock.module.css'

function hasSideInfoData(info: SectionSideInfo | undefined): boolean {
  if (!info) return false
  const t = (s?: string) => Boolean(s?.trim())
  if (t(info.overview)) return true
  if (t(info.timeframe)) return true
  if (participantsHasData(info.participants)) return true
  if (t(info.role)) return true
  if (t(info.tools)) return true
  if (t(info.methods)) return true
  if (t(info.location)) return true
  if (info.links?.some((l) => t(l.label) && t(l.href))) return true
  if (info.awards?.some((a) => t(a.label))) return true
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

function ParticipantsValue({ participants }: { participants: SectionSideInfoParticipant[] }) {
  return (
    <>
      {participants.map((p, i) => (
        <span key={`${p.name}-${i}`}>
          {i > 0 ? ', ' : null}
          {p.url ? (
            <a href={p.url} rel="noopener noreferrer" target="_blank" className={styles.overviewCollabName}>
              {p.name}
            </a>
          ) : (
            p.name
          )}
        </span>
      ))}
    </>
  )
}

function OverviewRow({
  label,
  children,
  showLabel = true,
}: {
  label: string
  children: React.ReactNode
  /** When false, the label cell is empty so the grid stays aligned (e.g. extra link rows). */
  showLabel?: boolean
}) {
  return (
    <div className={styles.overviewRow}>
      {showLabel ? (
        <span className={styles.overviewLabel}>{label}</span>
      ) : (
        <span className={styles.overviewLabelEmpty} aria-hidden="true" />
      )}
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
  const participants = normalizeParticipants(info.participants)
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
          {participants.length > 0 ? (
            <OverviewRow label="Participants">
              <ParticipantsValue participants={participants} />
            </OverviewRow>
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
            <OverviewRow
              key={`${l.href}-${i}`}
              label={links.length === 1 ? 'Link' : 'Links'}
              showLabel={i === 0}
            >
              <a href={l.href.trim()} rel="noopener noreferrer" target="_blank" className={styles.overviewLink}>
                {l.label.trim()}
              </a>
            </OverviewRow>
          ))}

          {(info.awards ?? [])
            .filter((a): a is SectionSideInfoAward => Boolean(a.label?.trim()))
            .map((a, i) => (
              <OverviewRow
                key={`award-${i}-${a.label}`}
                label={a.type === 'nominated' ? 'Nominated' : 'Awarded'}
              >
                {a.href?.trim() ? (
                  <a href={a.href.trim()} rel="noopener noreferrer" target="_blank" className={styles.overviewLink}>
                    {a.label.trim()}
                  </a>
                ) : (
                  a.label.trim()
                )}
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
    const ariaLabel = media.alt?.trim() ? media.alt.trim() : undefined
    return (
      <div className={wrapClass}>
        <VideoInView
          src={media.src}
          poster={media.poster}
          className={mediaClass}
          style={positionStyle}
          ariaLabel={ariaLabel}
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

function rootSliceFromContent(content?: SectionContent): SectionSubBlock {
  return {
    heading: content?.heading,
    body: content?.body,
    media: content?.media,
    mediaMobile: content?.mediaMobile,
    gallery: content?.gallery,
  }
}

function effectiveSubLayout(sub: SectionSubBlock, parentLayout: SectionLayoutKey): SectionLayoutKey {
  return sub.layout ?? parentLayout
}

const GALLERY_LAYOUTS: SectionLayoutKey[] = [
  'gallery-strip',
  'media-carousel',
  'text-left-carousel-right',
  'carousel-left-text-right',
]

function sliceHasRenderable(slice: SectionSubBlock, layout: SectionLayoutKey): boolean {
  const bodyStr = trimText(slice.body)
  const headingStr = trimText(slice.heading)
  const hasText = Boolean(bodyStr || headingStr)
  const hasSingleMedia = Boolean(slice.media?.src || slice.mediaMobile?.src)
  const hasGallery = (slice.gallery?.length ?? 0) > 0
  if (layout === 'text-only') return hasText
  if (GALLERY_LAYOUTS.includes(layout)) return hasGallery || hasText
  return hasText || hasSingleMedia
}

/** Horizontally scrollable container for a single wide image. Supports drag-to-pan on desktop. */
function ScrollMediaWrap({
  media,
  loading,
}: {
  media: SectionContent['media']
  loading?: 'eager' | 'lazy'
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  if (!media?.src) return null

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapRef.current) return
    dragging.current = true
    startX.current = e.pageX - wrapRef.current.getBoundingClientRect().left
    scrollLeft.current = wrapRef.current.scrollLeft
    wrapRef.current.dataset.grabbing = '1'
  }
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging.current || !wrapRef.current) return
    e.preventDefault()
    const x = e.pageX - wrapRef.current.getBoundingClientRect().left
    wrapRef.current.scrollLeft = scrollLeft.current - (x - startX.current) * 1.2
  }
  const onMouseUp = () => {
    dragging.current = false
    if (wrapRef.current) delete wrapRef.current.dataset.grabbing
  }

  return (
    <div className={styles.scrollXOuter}>
      <div
        ref={wrapRef}
        className={styles.scrollXWrap}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {media.type === 'video' ? (
          <VideoInView
            src={media.src}
            poster={media.poster}
            className={styles.scrollXMedia}
            ariaLabel={media.alt?.trim() || undefined}
          />
        ) : (
          <img
            src={media.src}
            alt={media.alt ?? ''}
            className={styles.scrollXMedia}
            loading={loading}
            decoding={loading === 'eager' ? 'sync' : 'async'}
            draggable={false}
          />
        )}
      </div>
      <div className={styles.scrollXFade} aria-hidden="true" />
    </div>
  )
}

function SectionLayoutSlice({
  layout,
  slice,
  sectionLabel,
  display,
  isRoot,
  imageLoading,
}: {
  layout: SectionLayoutKey
  slice: SectionSubBlock
  sectionLabel: string
  display?: SectionContent['display']
  isRoot: boolean
  imageLoading: 'eager' | 'lazy'
}) {
  const bodyStr = trimText(slice.body)
  const headingStr = trimText(slice.heading)
  const hasBody = Boolean(bodyStr)
  const hasHeading = Boolean(headingStr)
  const hasText = hasBody || hasHeading
  const media = slice.media
  const mediaMobile = slice.mediaMobile
  const gallery = slice.gallery ?? []

  const showSectionTitle = isRoot && display?.showSectionTitle === true
  const sectionTitleAboveMedia = isRoot && display?.sectionTitleAboveMedia === true

  const hasSingleMedia = Boolean(media?.src || mediaMobile?.src)
  const hasGallery = gallery.length > 0

  const pureSingleMediaBlock = hasSingleMedia && !hasText
  const pureGalleryBlock = layout === 'gallery-strip' && hasGallery && !hasText

  const titleAboveMedia =
    showSectionTitle &&
    sectionTitleAboveMedia &&
    (((layout === 'media-above-text' || layout === 'media-wide-above-text') && pureSingleMediaBlock) ||
      ((layout === 'full-bleed-media' || layout === 'full-bleed-media-natural') && pureSingleMediaBlock) ||
      (layout === 'gallery-strip' && pureGalleryBlock))

  const showTitleWithText = showSectionTitle && !titleAboveMedia

  if (layout === 'text-only') {
    return (
      <div className={styles.textOnly}>
        <SectionTitle label={sectionLabel} visible={showTitleWithText} />
        <ContentHeading text={headingStr} />
        {hasBody ? <div className={styles.body}>{formatSectionBody(bodyStr)}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
      </div>
    )
  }

  if (layout === 'text-left-media-right') {
    return (
      <div className={styles.textLeftMediaRight}>
        <div className={styles.textBlock}>
          <SectionTitle label={sectionLabel} visible={showTitleWithText} />
          <ContentHeading text={headingStr} />
          {hasBody ? <div className={styles.body}>{formatSectionBody(bodyStr)}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
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
          {hasBody ? <div className={styles.body}>{formatSectionBody(bodyStr)}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
        </div>
      </div>
    )
  }

  if (layout === 'full-bleed-media' || layout === 'full-bleed-media-natural') {
    const showCaption =
      hasText ||
      (showTitleWithText && !pureSingleMediaBlock) ||
      (!hasSingleMedia && !hasText)
    const fullBleedRootClass =
      layout === 'full-bleed-media-natural'
        ? `${styles.fullBleedMedia} ${styles.fullBleedMediaNatural}`
        : styles.fullBleedMedia

    return (
      <div className={fullBleedRootClass}>
        <SectionTitle label={sectionLabel} visible={titleAboveMedia} />
        <div className={styles.mediaColumn}>
          <ResponsiveSingleMedia
            media={media}
            mediaMobile={mediaMobile}
            variant={layout === 'full-bleed-media' ? 'hero' : 'default'}
            loading={imageLoading}
          />
        </div>
        {showCaption ? (
          <div className={styles.caption}>
            <SectionTitle label={sectionLabel} visible={showTitleWithText} />
            <ContentHeading text={headingStr} />
            {hasBody ? <div className={styles.body}>{formatSectionBody(bodyStr)}</div> : null}
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

  if (layout === 'media-above-text' || layout === 'media-wide-above-text') {
    const showTextBlock =
      hasText || (showTitleWithText && !pureSingleMediaBlock) || !hasSingleMedia
    const mediaVariant = layout === 'media-above-text' ? 'hero' : 'default'

    return (
      <div className={styles.mediaAboveText}>
        <SectionTitle label={sectionLabel} visible={titleAboveMedia} />
        {hasSingleMedia ? (
          <div className={styles.mediaColumn}>
            <ResponsiveSingleMedia
              media={media}
              mediaMobile={mediaMobile}
              variant={mediaVariant}
              loading={imageLoading}
            />
          </div>
        ) : null}
        {showTextBlock ? (
          <div className={styles.textBlock}>
            <SectionTitle label={sectionLabel} visible={showTitleWithText && !pureSingleMediaBlock} />
            <ContentHeading text={headingStr} />
            {hasBody ? (
              <div className={styles.body}>{formatSectionBody(bodyStr)}</div>
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
            {hasBody ? <div className={styles.body}>{formatSectionBody(bodyStr)}</div> : null}
            {!hasBody && !hasHeading && !showTitleWithText ? (
              <p className={styles.placeholder}>Add content in admin.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  // ── Horizontal pan layouts ────────────────────────────────────────────────

  if (layout === 'media-scroll-x') {
    return (
      <div className={styles.mediaScrollX}>
        <SectionTitle label={sectionLabel} visible={showTitleWithText} />
        {hasSingleMedia ? (
          <ScrollMediaWrap media={media} loading={imageLoading} />
        ) : (
          <p className={styles.placeholder}>Add a wide image in admin.</p>
        )}
        {hasText && (
          <div className={styles.caption}>
            <ContentHeading text={headingStr} />
            {hasBody ? <div className={styles.body}>{formatSectionBody(bodyStr)}</div> : null}
          </div>
        )}
      </div>
    )
  }

  if (layout === 'text-left-scroll-media-right') {
    return (
      <div className={styles.textLeftMediaRight}>
        <div className={styles.textBlock}>
          <SectionTitle label={sectionLabel} visible={showTitleWithText} />
          <ContentHeading text={headingStr} />
          {hasBody ? <div className={styles.body}>{formatSectionBody(bodyStr)}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
        </div>
        <div className={styles.mediaColumn}>
          {hasSingleMedia ? (
            <ScrollMediaWrap media={media} loading={imageLoading} />
          ) : (
            <p className={styles.placeholder}>Add a wide image in admin.</p>
          )}
        </div>
      </div>
    )
  }

  if (layout === 'scroll-media-left-text-right') {
    return (
      <div className={styles.mediaLeftTextRight}>
        <div className={styles.mediaColumn}>
          {hasSingleMedia ? (
            <ScrollMediaWrap media={media} loading={imageLoading} />
          ) : (
            <p className={styles.placeholder}>Add a wide image in admin.</p>
          )}
        </div>
        <div className={styles.textBlock}>
          <SectionTitle label={sectionLabel} visible={showTitleWithText} />
          <ContentHeading text={headingStr} />
          {hasBody ? <div className={styles.body}>{formatSectionBody(bodyStr)}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
        </div>
      </div>
    )
  }

  // ── Carousel layouts ──────────────────────────────────────────────────────

  if (layout === 'media-carousel') {
    return (
      <div className={styles.mediaScrollX}>
        <SectionTitle label={sectionLabel} visible={showTitleWithText} />
        {hasGallery ? (
          <SectionCarousel items={gallery} loading={imageLoading} />
        ) : (
          <p className={styles.placeholder}>Add carousel images in admin.</p>
        )}
        {hasText && (
          <div className={styles.caption}>
            <ContentHeading text={headingStr} />
            {hasBody ? <div className={styles.body}>{formatSectionBody(bodyStr)}</div> : null}
          </div>
        )}
      </div>
    )
  }

  if (layout === 'text-left-carousel-right') {
    return (
      <div className={styles.textLeftMediaRight}>
        <div className={styles.textBlock}>
          <SectionTitle label={sectionLabel} visible={showTitleWithText} />
          <ContentHeading text={headingStr} />
          {hasBody ? <div className={styles.body}>{formatSectionBody(bodyStr)}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
        </div>
        <div className={styles.mediaColumn}>
          {hasGallery ? (
            <SectionCarousel items={gallery} loading={imageLoading} />
          ) : (
            <p className={styles.placeholder}>Add carousel images in admin.</p>
          )}
        </div>
      </div>
    )
  }

  if (layout === 'carousel-left-text-right') {
    return (
      <div className={styles.mediaLeftTextRight}>
        <div className={styles.mediaColumn}>
          {hasGallery ? (
            <SectionCarousel items={gallery} loading={imageLoading} />
          ) : (
            <p className={styles.placeholder}>Add carousel images in admin.</p>
          )}
        </div>
        <div className={styles.textBlock}>
          <SectionTitle label={sectionLabel} visible={showTitleWithText} />
          <ContentHeading text={headingStr} />
          {hasBody ? <div className={styles.body}>{formatSectionBody(bodyStr)}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.textOnly}>
      {hasBody ? <div className={styles.body}>{formatSectionBody(bodyStr)}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
    </div>
  )
}

export function SectionBlock({ layout, content, sectionLabel, imageLoading = 'lazy' }: Props) {
  if (layout === 'project-overview') {
    const si = content?.sideInfo
    return (
      <div className={styles.projectOverview}>
        <SectionTitle label={sectionLabel} visible={true} />
        {hasSideInfoData(si) ? (
          <OverviewFactsPanel info={si!} />
        ) : (
          <p className={styles.placeholder}>Add overview facts in admin.</p>
        )}
      </div>
    )
  }

  const rootSlice = rootSliceFromContent(content)
  const subs = (content?.subsections ?? []).filter((s) =>
    sliceHasRenderable(s, effectiveSubLayout(s, layout)),
  )
  const rootEl = (
    <SectionLayoutSlice
      layout={layout}
      slice={rootSlice}
      sectionLabel={sectionLabel}
      display={content?.display}
      isRoot
      imageLoading={imageLoading}
    />
  )

  if (subs.length === 0) return rootEl

  return (
    <div className={styles.sectionRootAndSubs}>
      {rootEl}
      {subs.map((sub, i) => (
        <div key={`sub-${i}-${trimText(sub.heading) || trimText(sub.body) || i}`} className={styles.sectionSubBlock}>
          <SectionLayoutSlice
            layout={effectiveSubLayout(sub, layout)}
            slice={sub}
            sectionLabel={sectionLabel}
            display={undefined}
            isRoot={false}
            imageLoading="lazy"
          />
        </div>
      ))}
    </div>
  )
}
