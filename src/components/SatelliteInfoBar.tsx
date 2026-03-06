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

import { useEffect, useRef, useState } from 'react'
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

const NORWAY_TOOLTIP_MOBILE =
  "This frame follows satellites over Norway: from about 58°N (southern Norway) up to 71°N (past North Cape), and from the Norwegian Sea at about 5°E east to the border with Finland and Russia near 31°E. The view is updated in real time."

export function SatelliteInfoBar({ info, isMobile: isMobileProp }: SatelliteInfoBarProps) {
  const osloTime = useOsloClock()
  const isMobileQuery = useMediaQuery('(max-width: 820px)')
  const isMobile = isMobileProp ?? isMobileQuery
  const [norwayTooltipOpen, setNorwayTooltipOpen] = useState(false)
  const norwayRegionRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!norwayTooltipOpen) return
    const handlePointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (norwayRegionRef.current && !norwayRegionRef.current.contains(target)) {
        setNorwayTooltipOpen(false)
      }
    }
    const rafId = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handlePointer)
      document.addEventListener('touchstart', handlePointer, { passive: true })
    })
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('touchstart', handlePointer)
    }
  }, [norwayTooltipOpen])

  if (isMobile) {
    return (
      <section className={styles.bar} aria-label="Satellite tracking info" data-mobile>
        <div className={styles.mobileRegionWrap}>
          <button
            ref={norwayRegionRef}
            type="button"
            className={styles.mobileRegionTap}
            onClick={() => setNorwayTooltipOpen((prev) => !prev)}
            aria-expanded={norwayTooltipOpen}
            aria-label="Region: Norway"
            aria-describedby={norwayTooltipOpen ? 'norway-tooltip-mobile' : undefined}
          >
            <span className={styles.regionName}>NORWAY</span>
            <span className={styles.regionCoords}>58°N – 71°N · 5°E – 31°E</span>
          </button>
          {norwayTooltipOpen && (
            <div
              id="norway-tooltip-mobile"
              className={styles.mobileNorwayTooltip}
              role="tooltip"
            >
              {NORWAY_TOOLTIP_MOBILE}
            </div>
          )}
        </div>
        <div className={styles.mobileRightCol}>
          <span className={styles.trackingLabel}>TRACKED</span>
          <span className={styles.trackingCount}>{info?.objectCount ?? 0} SATELLITES</span>
        </div>
      </section>
    )
  }

  return (
    <section className={styles.bar} aria-label="Satellite tracking info">
      {/* LEFT — region context */}
      <div className={styles.left}>
        <span className={`${styles.regionName} ${styles.tooltipTarget}`}>
          SCANDINAVIA / N.EUROPE
          <span className={styles.inlineTooltip}>
            This frame follows satellites from about Denmark&apos;s latitude up past northern Norway,&nbsp;but not all the way to the North Pole — roughly the skies above Scandinavia and nearby seas. The view is updated in real time.
          </span>
        </span>
        <span className={styles.regionCoords}>50°N – 80°N&nbsp;&nbsp;·&nbsp;&nbsp;15°W – 45°E</span>
      </div>

      {/* CENTER — featured satellite */}
      <div className={styles.center}>
        {info?.featured ? (
          <>
            <span className={styles.category}>{info.featured.category}</span>
            <span className={styles.sep}>·</span>
            {info.featuredIsPriority ? (
              <span className={`${styles.satName} ${styles.tooltipTarget}`}>
                {info.featured.name}
                <span className={styles.inlineTooltip}>
                  Currently the most interesting object in frame.
                </span>
              </span>
            ) : (
              <span className={styles.satName}>{info.featured.name}</span>
            )}
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
    </section>
  )
}
