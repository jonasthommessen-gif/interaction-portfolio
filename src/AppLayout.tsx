import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { NavbarInvertProvider } from './contexts/NavbarInvertContext'
import { Navbar } from './components/Navbar'
import { LoadingScreen } from './components/LoadingScreen'
import { useTLEData } from './hooks/useTLEData'
import { getProjectBySlug } from './content/projects'

const SITE_TITLE = 'Jonas Thommessen'
const DEFAULT_DESCRIPTION =
  'Portfolio of Jonas Thommessen — UX, UI, systems thinking, prototyping, and motion design.'

function getPageMeta(pathname: string): { title: string; description: string } {
  if (pathname === '/') return { title: SITE_TITLE, description: DEFAULT_DESCRIPTION }
  if (pathname === '/projects') return { title: `Projects | ${SITE_TITLE}`, description: 'Project case studies and prototypes.' }
  if (pathname === '/about') return { title: `About | ${SITE_TITLE}`, description: 'About Jonas Thommessen and how to get in touch.' }
  if (pathname === '/archive') return { title: `Archive | ${SITE_TITLE}`, description: 'Archive of work and experiments.' }
  const projectMatch = pathname.match(/^\/projects\/(.+)$/)
  if (projectMatch) {
    const project = getProjectBySlug(projectMatch[1])
    if (project) return { title: `${project.title} | ${SITE_TITLE}`, description: project.categories.join(', ') + '.' }
    return { title: `Not found | ${SITE_TITLE}`, description: DEFAULT_DESCRIPTION }
  }
  return { title: `Not found | ${SITE_TITLE}`, description: DEFAULT_DESCRIPTION }
}

// Maximum time to wait for TLEs before showing the app anyway
const TLE_TIMEOUT_MS = 5000
// Minimum time the loading screen is shown — ensures animation plays through once
const MIN_LOADING_MS = 1500
// After TLEs load, wait this long so the overlay can run recomputeTrails and draw at least one frame
const POST_TLE_DELAY_MS = 1200

export function AppLayout() {
  const location = useLocation()

  // Per-route document title and meta for SEO
  useEffect(() => {
    const { title, description } = getPageMeta(location.pathname)
    document.title = title
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) metaDesc.setAttribute('content', description)
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) ogTitle.setAttribute('content', title)
    const ogDesc = document.querySelector('meta[property="og:description"]')
    if (ogDesc) ogDesc.setAttribute('content', description)
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl && typeof window !== 'undefined') ogUrl.setAttribute('content', window.location.origin + location.pathname)
  }, [location.pathname])

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
      <a href="#main-content" className="skipLink">
        Skip to main content
      </a>
      <LoadingScreen ready={appReady} />
      <Navbar />
      <div id="main-content">
        <Outlet />
      </div>
    </NavbarInvertProvider>
  )
}
