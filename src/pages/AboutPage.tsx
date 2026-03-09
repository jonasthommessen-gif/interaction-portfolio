import { useState } from 'react'
import { GrainBackground } from '../components/GrainBackground'
import { AboutGridOverlay } from '../components/AboutGridOverlay'
import { AboutOverlay } from '../components/AboutOverlay'
import styles from './AboutPage.module.css'

export function AboutPage() {
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  return (
    <main className={styles.page}>
      <GrainBackground />
      <AboutGridOverlay />
      <AboutOverlay showAdminLogin={showAdminLogin} onOpenAdminLogin={() => setShowAdminLogin(true)} onCloseAdminLogin={() => setShowAdminLogin(false)} />
    </main>
  )
}
