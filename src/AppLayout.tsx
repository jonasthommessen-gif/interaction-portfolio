import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { NavbarInvertProvider } from './contexts/NavbarInvertContext'
import { Navbar } from './components/Navbar'
import { LoadingScreen } from './components/LoadingScreen'
import { useTLEData } from './hooks/useTLEData'

// Maximum time to wait for TLEs before showing the app anyway
const TLE_TIMEOUT_MS = 5000
// Minimum time the loading screen is shown — ensures animation plays through once
const MIN_LOADING_MS = 1500
// After TLEs load, wait this long so the overlay can run recomputeTrails and draw at least one frame
const POST_TLE_DELAY_MS = 800

export function AppLayout() {
  const [docReady, setDocReady] = useState(
    typeof document !== 'undefined' && document.readyState === 'complete',
  )
  // Safety valve: if TLEs take too long, don't block the app forever
  const [tleTimedOut, setTleTimedOut] = useState(false)
  // Minimum display time — always show loading screen for at least MIN_LOADING_MS
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  // After TLE load, delay before allowing ready so overlay can draw sats
  const [tleSettledElapsed, setTleSettledElapsed] = useState(false)

  useEffect(() => {
    if (document.readyState === 'complete') {
      setDocReady(true)
      return
    }
    const onLoad = () => setDocReady(true)
    window.addEventListener('load', onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  useEffect(() => {
    const minTimer = setTimeout(() => setMinTimeElapsed(true), MIN_LOADING_MS)
    const maxTimer = setTimeout(() => setTleTimedOut(true), TLE_TIMEOUT_MS)
    return () => {
      clearTimeout(minTimer)
      clearTimeout(maxTimer)
    }
  }, [])

  // TLE loading state — the loading screen stays until TLEs are fetched (or failed/timed out)
  const { loading: tleLoading } = useTLEData()

  // When TLE loading finishes, wait POST_TLE_DELAY_MS so overlay can draw sats before we hide loading
  useEffect(() => {
    if (tleLoading) return
    const timer = setTimeout(() => setTleSettledElapsed(true), POST_TLE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [tleLoading])

  // App is ready when: doc loaded + (TLEs done OR timed out) + min time + (post-TLE delay elapsed OR timed out)
  const appReady =
    docReady &&
    (!tleLoading || tleTimedOut) &&
    minTimeElapsed &&
    (tleSettledElapsed || tleTimedOut)

  return (
    <NavbarInvertProvider>
      <LoadingScreen ready={appReady} />
      <Navbar />
      <Outlet />
    </NavbarInvertProvider>
  )
}
