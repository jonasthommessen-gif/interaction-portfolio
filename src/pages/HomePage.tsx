import { useState } from 'react'
import { GrainBackground } from '../components/GrainBackground'
import { SatelliteOverlay } from '../components/SatelliteOverlay'
import { SatelliteInfoBar } from '../components/SatelliteInfoBar'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { OverlayInfo } from '../components/SatelliteOverlay'
import { NORWAY_BBOX, SCANDINAVIA_BBOX } from '../lib/satelliteMath'
import styles from './HomePage.module.css'

export function HomePage() {
  const [overlayInfo, setOverlayInfo] = useState<OverlayInfo | null>(null)
  const isMobile = useMediaQuery('(max-width: 820px)')

  return (
    <main className={`page ${styles.page}`}>
      <GrainBackground />
      <SatelliteOverlay
        bbox={isMobile ? NORWAY_BBOX : SCANDINAVIA_BBOX}
        onFeaturedSat={setOverlayInfo}
        hideTracks={isMobile}
      />
      <SatelliteInfoBar info={overlayInfo} isMobile={isMobile} />
    </main>
  )
}
