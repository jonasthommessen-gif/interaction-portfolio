import { GrainBackground } from '../components/GrainBackground'
import { AboutOverlay } from '../components/AboutOverlay'
import styles from './AboutPage.module.css'

export function AboutPage() {
  return (
    <main className={styles.page}>
      <GrainBackground />
      <AboutOverlay />
    </main>
  )
}
