import type { SectionContent, SectionLayoutKey } from '../types/cms'
import styles from './SectionBlock.module.css'

type Props = { layout: SectionLayoutKey; content?: SectionContent }

function MediaBlock({ media }: { media: SectionContent['media'] }) {
  if (!media?.src) return null
  if (media.type === 'video') {
    return (
      <div className={styles.mediaWrap}>
        <video src={media.src} poster={media.poster} controls className={styles.media} />
      </div>
    )
  }
  return (
    <div className={styles.mediaWrap}>
      <img src={media.src} alt={media.alt ?? ''} className={styles.media} />
    </div>
  )
}

export function SectionBlock({ layout, content }: Props) {
  const body = content?.body
  const media = content?.media
  const heading = content?.heading
  const gallery = content?.gallery ?? []

  if (layout === 'text-only') {
    return (
      <div className={styles.textOnly}>
        {heading && <h3 className={styles.heading}>{heading}</h3>}
        {body ? <div className={styles.body}>{body}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
      </div>
    )
  }

  if (layout === 'text-left-media-right') {
    return (
      <div className={styles.textLeftMediaRight}>
        <div className={styles.textBlock}>
          {heading && <h3 className={styles.heading}>{heading}</h3>}
          {body ? <div className={styles.body}>{body}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
        </div>
        <MediaBlock media={media} />
      </div>
    )
  }

  if (layout === 'media-left-text-right') {
    return (
      <div className={styles.mediaLeftTextRight}>
        <MediaBlock media={media} />
        <div className={styles.textBlock}>
          {heading && <h3 className={styles.heading}>{heading}</h3>}
          {body ? <div className={styles.body}>{body}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
        </div>
      </div>
    )
  }

  if (layout === 'full-bleed-media') {
    return (
      <div className={styles.fullBleedMedia}>
        <MediaBlock media={media} />
        {(heading || body) && (
          <div className={styles.caption}>
            {heading && <h3 className={styles.heading}>{heading}</h3>}
            {body && <div className={styles.body}>{body}</div>}
          </div>
        )}
      </div>
    )
  }

  if (layout === 'media-above-text') {
    return (
      <div className={styles.mediaAboveText}>
        <MediaBlock media={media} />
        <div className={styles.textBlock}>
          {heading && <h3 className={styles.heading}>{heading}</h3>}
          {body ? <div className={styles.body}>{body}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
        </div>
      </div>
    )
  }

  if (layout === 'gallery-strip') {
    return (
      <div className={styles.galleryStrip}>
        {gallery.length > 0 ? (
          <div className={styles.gallery}>
            {gallery.map((item, i) => (
              <figure key={i} className={styles.galleryItem}>
                <img src={item.src} alt={item.alt ?? ''} className={styles.galleryImg} />
                {item.caption && <figcaption className={styles.galleryCaption}>{item.caption}</figcaption>}
              </figure>
            ))}
          </div>
        ) : (
          <p className={styles.placeholder}>Add gallery images in admin.</p>
        )}
        {(heading || body) && (
          <div className={styles.textBlock}>
            {heading && <h3 className={styles.heading}>{heading}</h3>}
            {body && <div className={styles.body}>{body}</div>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.textOnly}>
      {body ? <div className={styles.body}>{body}</div> : <p className={styles.placeholder}>Add content in admin.</p>}
    </div>
  )
}
