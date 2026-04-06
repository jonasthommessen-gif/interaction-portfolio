import type { SectionContent, SectionLayoutKey } from '../types/cms'
import styles from './SectionBlock.module.css'

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
  const positionStyle = {
    objectFit: 'cover' as const,
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
  const gallery = content?.gallery ?? []
  const showSectionTitle = content?.display?.showSectionTitle === true
  const sectionTitleAboveMedia = content?.display?.sectionTitleAboveMedia === true

  const hasSingleMedia = Boolean(media?.src)
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
        <MediaBlock media={media} variant="default" loading={imageLoading} />
      </div>
    )
  }

  if (layout === 'media-left-text-right') {
    return (
      <div className={styles.mediaLeftTextRight}>
        <MediaBlock media={media} variant="default" loading={imageLoading} />
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

    return (
      <div className={styles.fullBleedMedia}>
        <SectionTitle label={sectionLabel} visible={titleAboveMedia} />
        <MediaBlock media={media} variant="hero" loading={imageLoading} />
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
        {hasSingleMedia ? <MediaBlock media={media} variant="hero" loading={imageLoading} /> : null}
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
