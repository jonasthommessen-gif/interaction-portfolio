import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { SectionBlock } from '../components/SectionBlock'
import { fetchProjectBySlug } from '../lib/cms'
import type { Project } from '../types/cms'
import { NotFoundPage } from './NotFoundPage'
import styles from './ProjectDetailPage.module.css'

function parseCssPx(value: string) {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

export function ProjectDetailPage() {
  const { slug } = useParams()
  const [project, setProject] = useState<Project | null | undefined>(null)
  const [separatorLineTop, setSeparatorLineTop] = useState<number | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const separatorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!slug) {
      setProject(undefined)
      return
    }
    setProject(null)
    fetchProjectBySlug(slug)
      .then(setProject)
      .catch(() => setProject(undefined))
  }, [slug])

  useEffect(() => {
    document.documentElement.classList.add('project-detail-page')
    document.body.classList.add('project-detail-page')
    return () => {
      document.documentElement.classList.remove('project-detail-page')
      document.body.classList.remove('project-detail-page')
    }
  }, [])

  const title = useMemo(() => {
    if (project) return project.title
    if (!slug) return 'Project'
    return slug
      .split('-')
      .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
      .join(' ')
  }, [project, slug])

  const sections = useMemo(
    () =>
      project?.sections?.length
        ? project.sections.map((s) => ({
            id: s.id,
            label: s.label,
            layout: s.layout,
            content: s.content,
          }))
        : [],
    [project],
  )

  useEffect(() => {
    if (!sections.length) {
      setActiveSectionId(null)
      return
    }
    setActiveSectionId((prev) => {
      if (prev && sections.some((s) => s.id === prev)) return prev
      return sections[0].id
    })
  }, [sections])

  useEffect(() => {
    if (!sections.length) return

    const applyHash = () => {
      const h = window.location.hash
      if (!h.startsWith('#section-')) return
      const id = h.slice('#section-'.length)
      if (sections.some((s) => s.id === id)) setActiveSectionId(id)
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [sections])

  useEffect(() => {
    if (!sections.length || !project) return

    const elements = sections
      .map((s) => document.getElementById(`section-${s.id}`))
      .filter((el): el is HTMLElement => el !== null)
    if (!elements.length) return

    const navOffsetPx = () => {
      const root = document.documentElement
      const h = parseCssPx(getComputedStyle(root).getPropertyValue('--nav-height'))
      const o = parseCssPx(getComputedStyle(root).getPropertyValue('--nav-offset'))
      return h + o + 24
    }

    const thresholds = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting && e.target.id.startsWith('section-'))
        if (intersecting.length === 0) return
        intersecting.sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const id = intersecting[0].target.id.replace(/^section-/, '')
        setActiveSectionId(id)
      },
      {
        root: null,
        rootMargin: `-${navOffsetPx()}px 0px -35% 0px`,
        threshold: thresholds,
      },
    )

    elements.forEach((el) => observer.observe(el))

    const onScroll = () => {
      const last = elements[elements.length - 1]
      const rect = last.getBoundingClientRect()
      if (rect.bottom <= window.innerHeight + 2) {
        const id = last.id.replace(/^section-/, '')
        setActiveSectionId(id)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [project, sections])

  useEffect(() => {
    if (!project || !separatorRef.current) return
    const measure = () => {
      const sep = separatorRef.current
      if (!sep) return
      const { top } = sep.getBoundingClientRect()
      if (window.innerWidth >= 980) setSeparatorLineTop(top)
      else setSeparatorLineTop(null)
    }
    const id = requestAnimationFrame(() => measure())
    const onResize = () => requestAnimationFrame(measure)
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', onResize)
    }
  }, [project])

  const sectionLinks = useMemo(
    () => (
      <>
        {sections.map((section) => {
          const isActive = activeSectionId === section.id
          return (
            <a
              key={section.id}
              className={`${styles.sectionLink}${isActive ? ` ${styles.sectionLinkActive}` : ''}`}
              href={`#section-${section.id}`}
              aria-current={isActive ? 'location' : undefined}
              onClick={() => setActiveSectionId(section.id)}
            >
              {section.label}
            </a>
          )
        })}
      </>
    ),
    [sections, activeSectionId],
  )

  if (slug && project === undefined) {
    return (
      <Suspense fallback={null}>
        <NotFoundPage />
      </Suspense>
    )
  }

  if (project === null) {
    return (
      <main className={`page ${styles.page}`}>
        <div className={`container ${styles.grid}`}>
          <p className={styles.placeholder}>Loading project…</p>
        </div>
      </main>
    )
  }

  return (
    <main className={`page ${styles.page}`}>
      {separatorLineTop !== null && (
        <div
          className={styles.separatorLineFixed}
          style={{ top: separatorLineTop }}
          aria-hidden
        />
      )}
      <div className={`container ${styles.grid}`}>
        <aside className={styles.sidebar} aria-label="Project navigation">
          <div className={styles.sidebarInner}>
            <div className={styles.sidebarIntro}>
              <NavLink className={styles.backLink} to="/projects" aria-label="Back to Projects">
                ←
              </NavLink>

              <h1 className={styles.title}>{title}</h1>

              {project?.description ? (
                <p className={styles.description}>{project.description}</p>
              ) : null}

              <div className={styles.sidebarHeader}>
                {project && project.categories.length > 0 ? (
                  <div className={styles.categoryList} aria-label="Project categories">
                    {project.categories.slice(0, 3).map((c) => (
                      <div key={c} className={styles.categoryItem}>· {c}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles.separator} aria-hidden ref={separatorRef}>
              <div className={styles.separatorLine} />
            </div>

            {sections.length > 0 && (
              <nav className={styles.sectionNav} aria-label="Sections">
                {sectionLinks}
              </nav>
            )}
          </div>
        </aside>

        <div className={styles.content}>
          {sections.length > 0 ? (
            sections.map((section, index) => (
              <section
                key={section.id}
                id={`section-${section.id}`}
                className={styles.section}
                aria-label={section.label}
              >
                <SectionBlock
                  layout={section.layout}
                  content={section.content}
                  sectionLabel={section.label}
                  imageLoading={index === 0 ? 'eager' : 'lazy'}
                />
              </section>
            ))
          ) : (
            <p className={styles.placeholder}>No sections yet. Add sections in the admin.</p>
          )}
        </div>
      </div>

      {sections.length > 0 && (
        <nav className={styles.sectionNavBottom} aria-label="Sections">
          {sectionLinks}
        </nav>
      )}
    </main>
  )
}
