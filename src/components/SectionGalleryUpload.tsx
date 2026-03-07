import { useRef, useState } from 'react'
import { uploadPortfolioMedia } from '../lib/cms'
import type { SectionContent } from '../types/cms'
import styles from './SectionGalleryUpload.module.css'

type GalleryItem = { src: string; alt?: string; caption?: string }

type Props = {
  value: SectionContent['gallery']
  onChange: (gallery: SectionContent['gallery']) => void
  uploadFolder: string
}

export function SectionGalleryUpload({ value, onChange, uploadFolder }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const items: GalleryItem[] = value ?? []

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    setUploadError(null)
    setUploading(true)
    const { url, error } = await uploadPortfolioMedia(file, uploadFolder)
    setUploading(false)
    if (error) {
      setUploadError(error)
      return
    }
    if (url) onChange([...items, { src: url, alt: '', caption: '' }])
  }

  const updateItem = (index: number, patch: Partial<GalleryItem>) => {
    const next = [...items]
    next[index] = { ...next[index], ...patch }
    onChange(next)
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className={styles.wrap}>
      <label className={styles.label}>Gallery images</label>
      <ul className={styles.list}>
        {items.map((item, i) => (
          <li key={`${item.src}-${i}`} className={styles.item}>
            <div className={styles.thumbWrap}>
              <img src={item.src} alt="" className={styles.thumb} />
            </div>
            <div className={styles.itemFields}>
              <input
                type="text"
                value={item.alt ?? ''}
                onChange={(e) => updateItem(i, { alt: e.target.value || undefined })}
                className={styles.input}
                placeholder="Alt text"
              />
              <input
                type="text"
                value={item.caption ?? ''}
                onChange={(e) => updateItem(i, { caption: e.target.value || undefined })}
                className={styles.input}
                placeholder="Caption"
              />
              <button type="button" className={styles.removeBtn} onClick={() => removeItem(i)}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className={styles.addZone}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className={styles.fileInput}
          disabled={uploading}
        />
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Uploading…' : 'Add image'}
        </button>
      </div>
      {uploadError && <p className={styles.error}>{uploadError}</p>}
    </div>
  )
}
