# NH Math Academy

A zero-trust e-learning platform for university-level mathematics. Every
student starts locked; nothing plays until an instructor approves them from
the admin dashboard. Built entirely on free tiers: Next.js on Vercel,
Postgres/Auth/Storage on Supabase, video via YouTube Unlisted.

## What's implemented

- **Auth & RBAC** — registration collects the full data model from the spec
  (names, .edu + personal email, phone/WhatsApp, faculty, year), sign-up
  creates a `profiles` row with `role = 'student'`, `is_approved = false`.
- **Zero-trust gating** — Postgres Row Level Security is the real enforcement
  layer (see `supabase/migration.sql`); middleware and page-level checks are
  just UX. An unapproved or locked student only ever sees the pending screen.
- **Admin control center** (`/admin`) — pending count, student directory,
  one-click approve/revoke, emergency lock, batch-approve by academic year,
  and an announcements composer.
- **Curriculum management** (`/admin/courses`) — create courses, chapters,
  and lectures (title, YouTube unlisted ID) inline.
- **Student portal** (`/dashboard` → `/course/[id]` → lecture page) —
  course catalog, chapter/lecture list, video player with real 0.75×–2×
  speed control via the YouTube IFrame API, a floating watermark
  (name + phone, repositioning every few seconds), a signed-URL PDF viewer,
  a KaTeX-rendered formula cheat-sheet drawer, a local auto-saving notepad,
  and a Q&A thread that renders LaTeX in both questions and replies.
- **Splash screen** — animated "NH" monogram, plays once per browser session
  via `sessionStorage`, then reveals the landing page.
- **Anti-piracy basics** — right-click/context-menu disabled over protected
  media, 60-second expiring signed URLs for PDFs, and a `active_session_id`
  column laid down for single-session enforcement (see note below).

## What you still need to wire up before launch

These are flagged rather than faked, so you know exactly what's left:

1. **Session invalidation.** The `active_session_id` column and the login-time
   stamp are in place, but nothing yet forces out a second browser tab. The
   clean way to finish it: a Supabase Edge Function (or a `postgres_changes`
   realtime subscription in a root layout) that signs the client out if its
   locally-cached session id no longer matches `profiles.active_session_id`.
2. **PDF & cover image uploads.** The admin UI creates lecture *rows*, but the
   actual "upload PDF to Supabase Storage" file picker isn't wired into the
   curriculum manager yet — add a `<input type="file">` calling
   `supabase.storage.from('lecture-pdfs').upload(...)` and save the returned
   path into `lectures.pdf_storage_path`.
3. **Lecture edit form.** You can add a lecture with a title and YouTube ID;
   editing `description_latex` and `formula_sheet_latex` currently needs a
   direct Supabase Studio edit or a small extra form (same pattern as the
   existing insert calls).
4. **First admin account.** Sign up normally through `/register`, then run
   the commented `update` at the bottom of `supabase/migration.sql` with your
   email to flip yourself to `role = 'admin'`.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + keys
npm run dev
```

## Deploying (100% free tier)

1. **Supabase** — create a project at supabase.com (free tier). Open the SQL
   Editor and run the entire contents of `supabase/migration.sql`. This
   creates every table, the `is_admin()` / `is_approved_student()` helper
   functions, all RLS policies, and the two storage buckets.
2. Copy your Project URL and anon public key (Project Settings → API) into
   `.env.local` / your Vercel environment variables. Only add the
   `service_role` key to Vercel's env vars if you build the optional Edge
   Function above — never expose it to the browser.
3. **Vercel** — import this repo, framework preset "Next.js", add the three
   env vars from `.env.example`, deploy. Vercel's Hobby tier gives you free
   SSL and CI/CD on every push.
4. Register your own account, promote it to admin via the SQL comment
   mentioned above, then use `/admin` to build out courses and approve
   students.

## Notes on the anti-piracy layer

Nothing here can make a lecture literally unrippable — screen recording a
browser tab is always technically possible. What this stack does is remove
the *easy* leak paths (right-click save, direct file links, casual
re-sharing) and make any leak that does happen traceable back to the
specific student's name and phone number burned into the video via the
watermark.
