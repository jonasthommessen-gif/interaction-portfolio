# Supabase setup for admin auth

The hidden admin login (trigger on About page) and `/admin` use Supabase Auth. To enable it:

1. **Create a project** at [supabase.com](https://supabase.com) (free tier is enough).

2. **Get credentials:** In the Supabase dashboard, go to **Project Settings → API**. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

3. **Create `.env`** in the project root (copy from `.env.example`):
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Enable Email auth:** In Supabase, go to **Authentication → Providers**. Ensure **Email** is enabled. (You can disable "Confirm email" if you want to log in without verifying the first time.)

5. **Create your admin user:** **Authentication → Users → Add user**. Enter your email and a password. This is the only user who can log in; do not enable public sign-up.

6. Restart the dev server (`npm run dev`). Go to the About page, hold or hover on **JONAS THOMMESSEN** for 10 seconds, then log in with that email and password.

**Forgot password:** Use "Forgot password?" in the login modal; Supabase sends a reset link to your email. Set the redirect URL in Supabase **Authentication → URL Configuration** to include `https://yourdomain.com/admin` (and `http://localhost:5173/admin` for local dev).

**Database (for projects and archive):** Run the SQL migrations in order. In Supabase: **SQL Editor → New query**, paste each file’s contents, run it, then do the next.

| Order | File | What it does |
|-------|------|----------------|
| 1 | [001_initial_schema.sql](../supabase/migrations/001_initial_schema.sql) | Creates `projects`, `project_sections`, `archive_posts`, `archive_media` and storage bucket `portfolio-media`. **Run this first.** |
| 2 | [002_projects_description.sql](../supabase/migrations/002_projects_description.sql) | Adds `description` to `projects` (used in project sidebar). Required for project description in admin. |
| 3 | [003_seed_projects.sql](../supabase/migrations/003_seed_projects.sql) | *(Optional.)* Seeds the projects table so the admin list is editable without using “Import projects into database”. |
| 4 | [004_archive_visible_order.sql](../supabase/migrations/004_archive_visible_order.sql) | Adds `visible` and `order` to `archive_posts`. **Required** for reorder and visibility on the Admin Archive page. |
| 5 | [005_archive_media_display.sql](../supabase/migrations/005_archive_media_display.sql) | Adds `object_fit` and `object_position` to `archive_media` for feed crop/position (Adjust in New/Edit archive post). |

**Production (e.g. Vercel):** Set the same env vars in your host’s environment (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Rebuild/redeploy after adding or changing them; Vite bakes env at build time, so production won’t see new values until you redeploy.

**Backups:** In the Supabase dashboard you can export the database (Database → Backups or use point-in-time recovery on paid plans) and download storage files from the Storage tab. Recommended before big changes or periodically so you can restore if needed.
