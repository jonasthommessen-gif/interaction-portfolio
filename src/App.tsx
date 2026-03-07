import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppLayout } from './AppLayout'

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage').then(m => ({ default: m.ProjectDetailPage })))
const ArchivePage = lazy(() => import('./pages/ArchivePage').then(m => ({ default: m.ArchivePage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })))
const AdminLayout = lazy(() => import('./components/AdminLayout').then(m => ({ default: m.AdminLayout })))
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminProjectsPage = lazy(() => import('./pages/AdminProjectsPage').then(m => ({ default: m.AdminProjectsPage })))
const AdminProjectEditPage = lazy(() => import('./pages/AdminProjectEditPage').then(m => ({ default: m.AdminProjectEditPage })))
const AdminProjectNewPage = lazy(() => import('./pages/AdminProjectNewPage').then(m => ({ default: m.AdminProjectNewPage })))
const AdminArchivePage = lazy(() => import('./pages/AdminArchivePage').then(m => ({ default: m.AdminArchivePage })))
const AdminArchiveNewPage = lazy(() => import('./pages/AdminArchiveNewPage').then(m => ({ default: m.AdminArchiveNewPage })))
const AdminArchiveEditPage = lazy(() => import('./pages/AdminArchiveEditPage').then(m => ({ default: m.AdminArchiveEditPage })))
const AdminAboutPage = lazy(() => import('./pages/AdminAboutPage').then(m => ({ default: m.AdminAboutPage })))
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
          <Route path="/admin" element={<Suspense fallback={<RouteFallback />}><AdminLayout /></Suspense>}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="projects" element={<Suspense fallback={<RouteFallback />}><AdminProjectsPage /></Suspense>} />
            <Route path="projects/new" element={<Suspense fallback={<RouteFallback />}><AdminProjectNewPage /></Suspense>} />
            <Route path="projects/edit/:slug" element={<Suspense fallback={<RouteFallback />}><AdminProjectEditPage /></Suspense>} />
            <Route path="archive" element={<Suspense fallback={<RouteFallback />}><AdminArchivePage /></Suspense>} />
            <Route path="archive/new" element={<Suspense fallback={<RouteFallback />}><AdminArchiveNewPage /></Suspense>} />
            <Route path="archive/edit/:id" element={<Suspense fallback={<RouteFallback />}><AdminArchiveEditPage /></Suspense>} />
            <Route path="about" element={<Suspense fallback={<RouteFallback />}><AdminAboutPage /></Suspense>} />
          </Route>

          <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFoundPage /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

