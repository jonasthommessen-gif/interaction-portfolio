import { useState } from 'react'
import { GrainBackground } from '../components/GrainBackground'
import { SatelliteOverlay } from '../components/SatelliteOverlay'
import { SatelliteInfoBar } from '../components/SatelliteInfoBar'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { OverlayInfo } from '../components/SatelliteOverlay'
import styles from './HomePage.module.css'

export function HomePage() {
  const [overlayInfo, setOverlayInfo] = useState<OverlayInfo | null>(null)
  const isMobile = useMediaQuery('(max-width: 820px)')

  return (
    <main className={`page ${styles.page}`}>
      <GrainBackground />
      <SatelliteOverlay onFeaturedSat={setOverlayInfo} hideTracks={isMobile} />
      <SatelliteInfoBar info={overlayInfo} />
    </main>
  )
}
