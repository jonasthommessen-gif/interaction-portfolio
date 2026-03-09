import { useRef, useState } from 'react'
import { uploadPortfolioMedia } from '../lib/cms'
import type { SectionContent } from '../types/cms'
import { AdjustCropModal } from './AdjustCropModal'
import styles from './SectionMediaUpload.module.css'

type Props = {
  value: SectionContent['media']
  onChange: (media: SectionContent['media']) => void
  uploadFolder: string
  /** File input accept attribute; default allows image and video. */
  accept?: string
  /** Aspect ratio for the adjust-crop frame (e.g. '16/10' for project card). */
  cropAspectRatio?: string
  /** Label shown above the crop frame (e.g. "Project card on the site"). */
  cropFrameLabel?: string
  /** When true, show zoom slider in crop modal and pass objectScale in onChange (e.g. project cover). */
  cropEnableZoom?: boolean
}

function Preview({ media }: { media: NonNullable<SectionContent['media']> }) {
  if (media.type === 'video') {
    return (
      <video src={media.src} poster={media.poster} muted className={styles.preview} aria-hidden />
    )
  }
  return <img src={media.src} alt="" className={styles.preview} />
}

export function SectionMediaUpload({ value, onChange, uploadFolder, accept = 'image/*,video/*', cropAspectRatio, cropFrameLabel, cropEnableZoom }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [adjustCropOpen, setAdjustCropOpen] = useState(false)
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
    if (url) onChange({ type, src: url, alt: '', poster: type === 'video' ? undefined : undefined, objectPosition: undefined })
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
            <button type="button" className={styles.adjustCropBtn} onClick={() => setAdjustCropOpen(true)}>
              Adjust crop / position
            </button>
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
            accept={accept}
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
      {adjustCropOpen && value?.src && (
        <AdjustCropModal
          open={true}
          onClose={() => setAdjustCropOpen(false)}
          onSave={(objectPosition, objectScale) => {
            onChange({ ...value, objectPosition, objectScale })
            setAdjustCropOpen(false)
          }}
          src={value.src}
          type={value.type}
          initialObjectPosition={value.objectPosition ?? '50% 50%'}
          enableZoom={cropEnableZoom}
          initialScale={value.objectScale ?? 1}
          aspectRatio={cropAspectRatio}
          frameLabel={cropFrameLabel}
        />
      )}
    </div>
  )
}
