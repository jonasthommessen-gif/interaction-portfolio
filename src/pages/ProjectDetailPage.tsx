import { Suspense, useEffect, useMemo, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { SectionBlock } from '../components/SectionBlock'
import { fetchProjectBySlug } from '../lib/cms'
import type { Project } from '../types/cms'
import { NotFoundPage } from './NotFoundPage'
import styles from './ProjectDetailPage.module.css'

export function ProjectDetailPage() {
  const { slug } = useParams()
  const [project, setProject] = useState<Project | null | undefined>(null)

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
    document.body.classList.add('project-detail-page')
    return () => document.body.classList.remove('project-detail-page')
  }, [])

  if (slug && project === undefined) {
    return (
      <Suspense fallback={null}>
        <NotFoundPage />
      </Suspense>
    )
  }

  const title = useMemo(() => {
    if (project) return project.title
    if (!slug) return 'Project'
    return slug
      .split('-')
      .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
      .join(' ')
  }, [project, slug])

  const sections = project?.sections?.length
    ? project.sections.map((s) => ({ id: s.id, label: s.label, layout: s.layout, content: s.content }))
    : []

  const sectionLinks = (
    <>
      {sections.map((section) => (
        <a
          key={section.id}
          className={styles.sectionLink}
          href={`#section-${section.id}`}
        >
          {section.label}
        </a>
      ))}
    </>
  )

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
      <div className={`container ${styles.grid}`}>
        <aside className={styles.sidebar} aria-label="Project navigation">
          <div className={styles.sidebarInner}>
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

            <div className={styles.separator} aria-hidden>
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
            sections.map((section) => (
              <section key={section.id} id={`section-${section.id}`} className={styles.section}>
                <h2 className={styles.sectionTitle}>{section.label}</h2>
                <SectionBlock layout={section.layout} content={section.content} />
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
