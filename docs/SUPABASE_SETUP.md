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

**Database (for projects and archive):** Run the SQL migration so the app can store projects and archive posts. In Supabase: **SQL Editor → New query**. Paste the contents of [supabase/migrations/001_initial_schema.sql](../supabase/migrations/001_initial_schema.sql) and run it. That creates the `projects`, `project_sections`, `archive_posts`, and `archive_media` tables plus a storage bucket `portfolio-media` for uploads.
