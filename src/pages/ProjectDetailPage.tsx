import { useMemo } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { getProjectBySlug } from '../content/projects'
import styles from './ProjectDetailPage.module.css'

type SectionId =
  | 'showreel'
  | 'overview'
  | 'context'
  | 'research'
  | 'synthesis'
  | 'ideation'
  | 'design-solution'
  | 'testing'
  | 'final-outcome'
  | 'reflection'

type Section = {
  id: SectionId
  label: string
}

const SECTIONS: Section[] = [
  { id: 'showreel', label: 'Intro' },
  { id: 'overview', label: 'Overview' },
  { id: 'context', label: 'Context' },
  { id: 'research', label: 'Research' },
  { id: 'synthesis', label: 'Synthesis' },
  { id: 'ideation', label: 'Ideation' },
  { id: 'design-solution', label: 'Design Solution' },
  { id: 'testing', label: 'Testing' },
  { id: 'final-outcome', label: 'Final Outcome' },
  { id: 'reflection', label: 'Reflection' },
]

export function ProjectDetailPage() {
  const { slug } = useParams()

  const project = slug ? getProjectBySlug(slug) : undefined

  const title = useMemo(() => {
    if (project) return project.title
    if (!slug) return 'Project'
    // Simple prettifier fallback
    return slug
      .split('-')
      .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
      .join(' ')
  }, [project, slug])

  const sectionLinks = (
    <>
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          className={styles.sectionLink}
          href={`#${section.id}`}
        >
          {section.label}
        </a>
      ))}
    </>
  )

  return (
    <main className={`page ${styles.page}`}>
      <div className={`container ${styles.grid}`}>
        <aside className={styles.sidebar} aria-label="Project navigation">
          <div className={styles.sidebarInner}>
            <div className={styles.sidebarHeader}>
              <p className={styles.kicker}>Case study</p>
              <h1 className={styles.title}>{title}</h1>
              {project ? (
                <div className={styles.categoryRow} aria-label="Project categories">
                  {project.categories.slice(0, 3).map((c) => (
                    <span key={c} className={styles.categoryPill}>
                      {c}
                    </span>
                  ))}
                </div>
              ) : null}
              <NavLink className={styles.backLink} to="/projects">
                ← Back to Projects
              </NavLink>
            </div>

            <nav className={styles.sectionNav} aria-label="Sections">
              {sectionLinks}
            </nav>
          </div>
        </aside>

        <div className={styles.content}>
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className={styles.section}>
              <h2 className={styles.sectionTitle}>{section.label}</h2>
              <p className={styles.placeholder}>
                Placeholder content. Add this project’s {section.label.toLowerCase()}
                here.
              </p>
            </section>
          ))}
        </div>
      </div>

      <nav className={styles.sectionNavBottom} aria-label="Sections">
        {sectionLinks}
      </nav>
    </main>
  )
}
