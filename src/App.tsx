import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppLayout } from './AppLayout'

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })))
const ArchivePage = lazy(() => import('./pages/ArchivePage').then(m => ({ default: m.ArchivePage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

/** Minimal fallback so main content area does not collapse during route load (reduces CLS). */
const RouteFallback = () => (
  <div style={{ minHeight: '50vh' }} aria-hidden aria-busy="true" />
)

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Suspense fallback={<RouteFallback />}><HomePage /></Suspense>} />
          <Route path="/projects" element={<Suspense fallback={<RouteFallback />}><ProjectsPage /></Suspense>} />
          <Route path="/projects/:slug" element={<Suspense fallback={<RouteFallback />}><ProjectDetailPage /></Suspense>} />
          <Route path="/archive" element={<Suspense fallback={<RouteFallback />}><ArchivePage /></Suspense>} />
          <Route path="/about" element={<Suspense fallback={<RouteFallback />}><AboutPage /></Suspense>} />

          <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFoundPage /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

