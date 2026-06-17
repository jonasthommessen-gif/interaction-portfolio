import { useEffect, useState } from 'react'
import { fetchSiteSettings, updateSiteSettings } from '../lib/cms'
import {
  DEFAULT_ABOUT_BODY,
  DEFAULT_ABOUT_TITLE,
  type AboutPortrait,
  type AboutSkill,
} from '../lib/aboutContent'
import { SectionMediaUpload } from '../components/SectionMediaUpload'
import type { SectionContent } from '../types/cms'
import styles from './AdminAboutPage.module.css'
import editStyles from './AdminProjectEditPage.module.css'

export function AdminAboutPage() {
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState(DEFAULT_ABOUT_TITLE)
  const [body, setBody] = useState<string[]>([...DEFAULT_ABOUT_BODY])
  const [portraits, setPortraits] = useState<AboutPortrait[]>([])
  const [skills, setSkills] = useState<AboutSkill[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchSiteSettings()
      .then((settings) => {
        if (settings) {
          setTitle(settings.about_title)
          setBody(settings.about_body.length ? settings.about_body : [...DEFAULT_ABOUT_BODY])
          setPortraits(settings.about_portraits)
          setSkills(settings.about_skills)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const orderedPortraits = portraits
      .map((p, i) => ({ ...p, order: i }))
      .filter((p) => p.src.trim())
    const orderedSkills = skills
      .map((s, i) => ({ label: s.label.trim(), order: i }))
      .filter((s) => s.label)

    const first = orderedPortraits[0]
    const { error } = await updateSiteSettings({
      about_title: title.trim(),
      about_body: body.map((p) => p.trim()).filter(Boolean),
      about_portraits: orderedPortraits,
      about_skills: orderedSkills,
      about_portrait_src: first?.src ?? '',
      about_portrait_alt: first?.alt ?? '',
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
      <form onSubmit={handleSubmit} className={editStyles.form}>
        <div className={editStyles.field}>
          <label htmlFor="about-title" className={editStyles.label}>
            Headline
          </label>
          <textarea
            id="about-title"
            className={editStyles.textarea}
            rows={2}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className={editStyles.field}>
          <div className={editStyles.sideInfoListHeader}>
            <span className={editStyles.label}>Body paragraphs</span>
            <button
              type="button"
              className={editStyles.textButton}
              onClick={() => setBody([...body, ''])}
            >
              Add paragraph
            </button>
          </div>
          {body.map((para, i) => (
            <div key={`para-${i}`} className={styles.paragraphRow}>
              <textarea
                className={editStyles.textarea}
                rows={3}
                value={para}
                onChange={(e) => {
                  const next = [...body]
                  next[i] = e.target.value
                  setBody(next)
                }}
              />
              <button
                type="button"
                className={editStyles.textButton}
                onClick={() => setBody(body.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <section className={styles.portraitSection} aria-labelledby="about-portraits-heading">
          <div className={editStyles.sideInfoListHeader}>
            <h3 id="about-portraits-heading" className={styles.sectionsHeading}>
              Portraits
            </h3>
            <button
              type="button"
              className={editStyles.textButton}
              onClick={() =>
                setPortraits([...portraits, { src: '', alt: '', order: portraits.length }])
              }
            >
              Add image
            </button>
          </div>
          <p className={styles.hint}>
            Images in the portrait frame on the About page. Multiple images rotate every 4 seconds.
          </p>
          {portraits.map((p, i) => {
            const media: SectionContent['media'] = p.src
              ? { type: 'image', src: p.src, alt: p.alt ?? '' }
              : undefined
            return (
              <div key={`portrait-${i}`} className={styles.portraitRow}>
                <SectionMediaUpload
                  value={media}
                  onChange={(m) => {
                    const next = [...portraits]
                    if (!m) {
                      next[i] = { ...next[i], src: '', alt: '' }
                    } else {
                      next[i] = { ...next[i], src: m.src, alt: m.alt ?? '' }
                    }
                    setPortraits(next)
                  }}
                  uploadFolder="about"
                  accept="image/*"
                />
                <div className={styles.portraitRowActions}>
                  <button
                    type="button"
                    className={editStyles.textButton}
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...portraits]
                      const prev = next[i - 1]!
                      next[i - 1] = next[i]!
                      next[i] = prev
                      setPortraits(next)
                    }}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    className={editStyles.textButton}
                    disabled={i === portraits.length - 1}
                    onClick={() => {
                      const next = [...portraits]
                      const nxt = next[i + 1]!
                      next[i + 1] = next[i]!
                      next[i] = nxt
                      setPortraits(next)
                    }}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    className={editStyles.textButton}
                    onClick={() => setPortraits(portraits.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </section>

        <section className={styles.portraitSection} aria-labelledby="about-skills-heading">
          <div className={editStyles.sideInfoListHeader}>
            <h3 id="about-skills-heading" className={styles.sectionsHeading}>
              Skills
            </h3>
            <button
              type="button"
              className={editStyles.textButton}
              onClick={() => setSkills([...skills, { label: '', order: skills.length }])}
            >
              Add skill
            </button>
          </div>
          <p className={styles.hint}>Used for desktop orbit and mobile keyword row.</p>
          {skills.map((s, i) => (
            <div key={`skill-${i}`} className={editStyles.sideInfoRepeatRow}>
              <input
                className={editStyles.input}
                placeholder="Skill label"
                value={s.label}
                onChange={(e) => {
                  const next = [...skills]
                  next[i] = { ...next[i], label: e.target.value }
                  setSkills(next)
                }}
              />
              <button
                type="button"
                className={editStyles.textButton}
                disabled={i === 0}
                onClick={() => {
                  const next = [...skills]
                  const prev = next[i - 1]!
                  next[i - 1] = next[i]!
                  next[i] = prev
                  setSkills(next)
                }}
              >
                Up
              </button>
              <button
                type="button"
                className={editStyles.textButton}
                disabled={i === skills.length - 1}
                onClick={() => {
                  const next = [...skills]
                  const nxt = next[i + 1]!
                  next[i + 1] = next[i]!
                  next[i] = nxt
                  setSkills(next)
                }}
              >
                Down
              </button>
              <button
                type="button"
                className={editStyles.textButton}
                onClick={() => setSkills(skills.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          ))}
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
