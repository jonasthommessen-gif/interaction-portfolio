import { useRef, useState } from 'react'
import { uploadPortfolioMedia } from '../lib/cms'
import type { SectionContent } from '../types/cms'
import styles from './SectionMediaUpload.module.css'

type Props = {
  value: SectionContent['media']
  onChange: (media: SectionContent['media']) => void
  uploadFolder: string
}

function Preview({ media }: { media: NonNullable<SectionContent['media']> }) {
  if (media.type === 'video') {
    return (
      <video src={media.src} poster={media.poster} muted className={styles.preview} aria-hidden />
    )
  }
  return <img src={media.src} alt="" className={styles.preview} />
}

export function SectionMediaUpload({ value, onChange, uploadFolder }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadError(null)
    setUploading(true)
    const type = file.type.startsWith('video/') ? ('video' as const) : ('image' as const)
    const { url, error } = await uploadPortfolioMedia(file, uploadFolder)
    setUploading(false)
    if (error) {
      setUploadError(error)
      return
    }
    if (url) onChange({ type, src: url, alt: '', poster: type === 'video' ? undefined : undefined })
  }

  const handleClear = () => onChange(undefined)

  return (
    <div className={styles.wrap}>
      <label className={styles.label}>Media (image or video)</label>
      {value?.src ? (
        <div className={styles.hasMedia}>
          <div className={styles.previewWrap}>
            <Preview media={value} />
          </div>
          <div className={styles.mediaFields}>
            <label className={styles.fieldLabel}>
              Alt text
              <input
                type="text"
                value={value.alt ?? ''}
                onChange={(e) => onChange({ ...value, alt: e.target.value || undefined })}
                className={styles.input}
                placeholder="Describe the image for accessibility"
              />
            </label>
            {value.type === 'video' && (
              <label className={styles.fieldLabel}>
                Poster image URL (optional)
                <input
                  type="text"
                  value={value.poster ?? ''}
                  onChange={(e) => onChange({ ...value, poster: e.target.value || undefined })}
                  className={styles.input}
                  placeholder="URL of poster frame"
                />
              </label>
            )}
            <button type="button" className={styles.clearBtn} onClick={handleClear}>
              Remove media
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.uploadZone}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className={styles.fileInput}
            disabled={uploading}
          />
          <button
            type="button"
            className={styles.uploadBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Choose image or video'}
          </button>
        </div>
      )}
      {uploadError && <p className={styles.error}>{uploadError}</p>}
    </div>
  )
}
