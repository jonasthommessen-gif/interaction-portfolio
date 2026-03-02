import { useState } from 'react'
import { GrainBackground } from '../components/GrainBackground'
import { SatelliteOverlay } from '../components/SatelliteOverlay'
import { SatelliteInfoBar } from '../components/SatelliteInfoBar'
import type { OverlayInfo } from '../components/SatelliteOverlay'
import styles from './HomePage.module.css'

export function HomePage() {
  const [overlayInfo, setOverlayInfo] = useState<OverlayInfo | null>(null)

  return (
    <main className={`page ${styles.page}`}>
      <GrainBackground />
      <SatelliteOverlay onFeaturedSat={setOverlayInfo} />
      <SatelliteInfoBar info={overlayInfo} />
    </main>
  )
}
