# Contributing

## Running the project

- **Development**: `npm run dev` — starts Vite dev server with HMR
- **Build**: `npm run build` — TypeScript check + production build (output in `dist/`)
- **Build with bundle report**: `npm run build:analyze` — same as build, writes a visual bundle report to `dist/stats.html` (open in a browser or run `npm run preview` and visit the stats file to view it)
- **Preview**: `npm run preview` — serve the production build locally
- **Lint**: `npm run lint` — ESLint on the codebase
- **Tests**: `npm run test` (watch), `npm run test:run` (single run), `npm run test:coverage` (with coverage report)

## Adding a new page

1. Create a new component under `src/pages/` (e.g. `NewPage.tsx`).
2. In `src/App.tsx`, add a lazy import and a route:
   - `const NewPage = lazy(() => import('./pages/NewPage').then(m => ({ default: m.NewPage })))`
   - `<Route path="/new" element={<Suspense fallback={<RouteFallback />}><NewPage /></Suspense>} />`
3. Add a nav link in `src/components/Navbar.tsx` if the page should appear in the menu.

## Adding a new project

1. Open `src/content/projects.ts`.
2. Add an entry to the `projects` array with: `slug`, `title`, `categories`, `gradient` (from/to hex), and `cover` (image or video with `src` and optional `poster`/`alt`).
3. Use a URL-safe slug (e.g. `my-new-project`). The project will be available at `/projects/my-new-project`.
4. Add cover media under `public/images/` or `public/media/` as per the README asset conventions.

## Design tokens and breakpoints

To keep the UI consistent, use the CSS custom properties defined in `src/index.css` instead of hardcoding values:

- **Typography**: `--font-sans`, `--font-serif`; type scale `--text-xs` through `--heading-1`; optional `--leading-*`, `--tracking-*` (see Typography section below)
- **Layout**: `--container-max` (1120px), `--nav-height` (72px; 56px on mobile), `--nav-offset` (16px). **Nav bar height is the source of truth:** do not change `--nav-height` or alter the effective height of the nav bar (e.g. via pill min-heights, header styles, or padding) unless the project owner explicitly approves it; other changes must not increase the bar height.
- **Colors**: `--bg`, `--fg`, `--muted` (body and secondary text; AA contrast on `--bg`)
- **Frosted surfaces**: `--frost-bg`, `--frost-border`, `--frost-shadow`, `--blur`
- **Pills / buttons**: `--pill-bg`, `--pill-fg`, `--pill-hover-bg`, `--pill-active-bg`, `--pill-radius`
- **Motion**: `--ease-out` (cubic-bezier)

**Breakpoint**: The main mobile/desktop breakpoint is **820px** (e.g. `max-width: 820px` for mobile). Use it in media queries and in `useMediaQuery('(max-width: 820px)')` so layouts stay aligned.

When adding new components, prefer these tokens and the same breakpoint so the app feels coherent.

## Typography

- **Font families**: Use only `var(--font-sans)` or `var(--font-serif)`. No hardcoded font stacks. Serif is for page titles (h1), section titles (h2), and project/card titles; sans for body, nav, labels, and UI.
- **Weights**: Only use loaded weights 300, 400, 500, 600. Do not use 700 unless you add it to the Google Fonts request in `index.html`.
- **Type scale**: Prefer `--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-xl`, `--text-2xl`, `--text-3xl`, `--heading-1` for font-size instead of raw `px`/`rem`. Use `--tracking-tight` (-0.01em) for serif titles and `--tracking-wide` (or similar) for all-caps labels.
- **Page titles (h1)**: Serif, a heading step from the scale, **title case** (e.g. "Not Found", not "Not found").
- **Exception — HUD / data readout**: SatelliteInfoBar and SatelliteOverlay use very small pixel sizes (8–11px) by design; they still use `var(--font-sans)`. Do not copy those sizes for main content; use the type scale instead. Within the HUD, use the tokens `--tracking-hud-label`, `--tracking-hud-value`, and optionally `--hud-text` / `--hud-text-sm` / `--hud-text-xs` so SatelliteInfoBar and SatelliteOverlay stay consistent. **Casing**: All HUD text (labels, satellite name, tooltip name/category/description, and inline tooltip body text in `.inlineTooltip`) uses ALL CAPS via CSS `text-transform: uppercase` and `--tracking-hud-label` so the bar and tooltips follow the same principles.
- **Exception — About overlay**: The About overlay uses responsive `clamp(14px, 2.2vmin, 20px)` and `clamp(18px, 2.8vmin, 28px)` for body and hero text by design, for readability across viewports. These are intentional exceptions to the static scale; do not replace them with scale tokens unless you introduce named responsive tokens.

## More

- **Asset conventions** (Rive, project media, placeholders): see [README.md](README.md).
- **Architecture** (entry, routes, data sources): see the Architecture section in [README.md](README.md).
- **Security**: run `npm audit` periodically; see README Security section.
- **SEO**: Per-route titles and meta are set in `AppLayout`. If you deploy to a different domain, update `public/sitemap.xml` and `public/robots.txt` with the correct base URL.
