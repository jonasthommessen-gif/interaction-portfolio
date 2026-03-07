import { useEffect, useState } from 'react'
import { fetchSiteSettings, updateSiteSettings } from '../lib/cms'
import { SectionMediaUpload } from '../components/SectionMediaUpload'
import type { SectionContent } from '../types/cms'
import styles from './AdminAboutPage.module.css'

export function AdminAboutPage() {
  const [loading, setLoading] = useState(true)
  const [portraitSrc, setPortraitSrc] = useState('')
  const [portraitAlt, setPortraitAlt] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchSiteSettings()
      .then((settings) => {
        if (settings) {
          setPortraitSrc(settings.about_portrait_src ?? '')
          setPortraitAlt(settings.about_portrait_alt ?? '')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const portraitMedia: SectionContent['media'] =
    portraitSrc ? { type: 'image', src: portraitSrc, alt: portraitAlt } : undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    const { error } = await updateSiteSettings({
      about_portrait_src: portraitSrc.trim(),
      about_portrait_alt: portraitAlt.trim(),
    })
    setSaving(false)
    if (error) {
      setSaveError(error)
      return
    }
    setSaveSuccess(true)
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.message}>Loading…</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>About page</h2>
      <form onSubmit={handleSubmit}>
        <section className={styles.portraitSection} aria-labelledby="about-portrait-heading">
          <h3 id="about-portrait-heading" className={styles.sectionsHeading}>
            About page portrait
          </h3>
          <p className={styles.hint}>
            Image shown in the right panel on the About page (above “How to reach me”). Image only.
          </p>
          <SectionMediaUpload
            value={portraitMedia}
            onChange={(media) => {
              if (!media) {
                setPortraitSrc('')
                setPortraitAlt('')
              } else {
                setPortraitSrc(media.src)
                setPortraitAlt(media.alt ?? '')
              }
            }}
            uploadFolder="about"
            accept="image/*"
          />
        </section>
        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saveError && <p className={styles.error}>{saveError}</p>}
        {saveSuccess && <p className={styles.success}>Saved.</p>}
      </form>
    </div>
  )
}
