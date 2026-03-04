import { GrainBackground } from '../components/GrainBackground'
import { AboutGridOverlay } from '../components/AboutGridOverlay'
import { AboutOverlay } from '../components/AboutOverlay'
import styles from './AboutPage.module.css'

export function AboutPage() {
  return (
    <main className={styles.page}>
      <GrainBackground />
      <AboutGridOverlay />
      <AboutOverlay />
    </main>
  )
}
