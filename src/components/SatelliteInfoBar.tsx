/**
 * SatelliteInfoBar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * A fixed bottom bar with three columns:
 *
 *   LEFT                    CENTER                          RIGHT
 *   SCANDINAVIA / N.EUROPE  ISS (ZARYA)  ·  63.4°N ...     TRACKING  12 OBJECTS
 *   50°N–80°N  ·  15°W–45°E                                LIVE  ·  UTC 01:26:19
 *                                                           ISS NEXT PASS  +04:32
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react'
import type { OverlayInfo } from './SatelliteOverlay'
import { useMediaQuery } from '../hooks/useMediaQuery'
import styles from './SatelliteInfoBar.module.css'

interface SatelliteInfoBarProps {
  info: OverlayInfo | null
  /** When true, show Norway frame and region text (mobile home) */
  isMobile?: boolean
}

function formatLat(lat: number): string {
  return `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`
}

function formatLon(lon: number): string {
  return `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`
}

function useOsloClock(): string {
  const fmt = () =>
    new Date().toLocaleTimeString('no-NO', {
      timeZone: 'Europe/Oslo',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

  const [time, setTime] = useState(fmt)

  useEffect(() => {
    const id = setInterval(() => setTime(fmt()), 1000)
    return () => clearInterval(id)
  }, [])

  return time
}

export function SatelliteInfoBar({ info, isMobile: isMobileProp }: SatelliteInfoBarProps) {
  const osloTime = useOsloClock()
  const isMobileQuery = useMediaQuery('(max-width: 820px)')
  const isMobile = isMobileProp ?? isMobileQuery

  if (isMobile) {
    return (
      <div className={styles.bar} aria-hidden="true" data-mobile>
        <div className={styles.mobileRow}>
          <span className={styles.regionName}>NORWAY</span>
          <span className={styles.trackingLabel}>TRACKED</span>
        </div>
        <div className={styles.mobileRow}>
          <span className={styles.regionCoords}>58°N – 71°N · 5°W – 31°E</span>
          <span className={styles.trackingCount}>{info?.objectCount ?? 0} SATELLITES</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.bar} aria-hidden="true">
      {/* LEFT — region context */}
      <div className={styles.left}>
        <span className={`${styles.regionName} ${styles.tooltipTarget}`}>
          SCANDINAVIA / N.EUROPE
          <span className={styles.inlineTooltip}>
            This frame follows satellites from about Denmark&apos;s latitude up past northern Norway,&nbsp;but not all the way to the North Pole — roughly the skies above Scandinavia and nearby seas.
          </span>
        </span>
        <span className={styles.regionCoords}>50°N – 80°N&nbsp;&nbsp;·&nbsp;&nbsp;15°W – 45°E</span>
      </div>

      {/* CENTER — featured satellite */}
      <div className={styles.center}>
        {info?.featured ? (
          <>
            <span className={styles.category}>{info.featured.category.toUpperCase()}</span>
            <span className={styles.sep}>·</span>
            <span className={styles.satName}>{info.featured.name}</span>
            <span className={styles.sep}>·</span>
            <span className={styles.value}>
              {formatLat(info.featured.lat)}&nbsp;&nbsp;{formatLon(info.featured.lon)}
            </span>
            <span className={styles.sep}>·</span>
            <span className={`${styles.value} ${styles.tooltipTarget}`}>
              {info.featured.altKm.toLocaleString()} km
              <span className={`${styles.inlineTooltip} ${styles.inlineTooltipNoWrap}`}>
                Current altitude above mean sea level.
              </span>
            </span>
            <span className={styles.sep}>·</span>
            <span className={styles.value}>{info.featured.velKms} km/s</span>
          </>
        ) : (
          <span className={styles.noSat}>NO OBJECTS IN FRAME</span>
        )}
      </div>

      {/* RIGHT — object count + UTC clock + ISS next pass */}
      <div className={styles.right}>
        <div className={styles.rightRow}>
          <span className={styles.trackingLabel}>TRACKING</span>
          <span className={styles.trackingCount}>{info?.objectCount ?? 0} SATELLITES</span>
        </div>
        <div className={styles.rightRow}>
          <span className={styles.liveLabel}>LIVE</span>
          <span className={styles.sep}>·</span>
          <span className={styles.utcTime}>OSLO {osloTime}</span>
        </div>
        {typeof info?.issNextPassMin === 'number' && (
          <div className={styles.rightRow}>
            <span className={styles.issLabel}>ISS NEXT PASS</span>
            <span className={styles.issTime}>
              {info.issNextPassMin >= 60
                ? `+${Math.floor(info.issNextPassMin / 60)}H ${info.issNextPassMin % 60}MIN`
                : `+${info.issNextPassMin} MIN`}
            </span>
          </div>
        )}
        {info?.issNextPassMin === null && (
          <div className={styles.rightRow}>
            <span className={styles.issInFrame}>ISS IN FRAME</span>
          </div>
        )}
      </div>
    </div>
  )
}
