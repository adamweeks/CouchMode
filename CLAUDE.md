# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CouchMode is a React + TypeScript PWA for tracking TV show rewatches. Users search shows via TMDB, track progress episode-by-episode across multiple rewatches, and view history/stats. Backend is Supabase (PostgreSQL + Auth + Edge Functions).

## Commands

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # TypeScript type check + Vite production build
npm run lint         # ESLint
npm run test         # Run all tests once (Vitest)
npm run test:watch   # Vitest watch mode
npm run preview      # Preview production build locally
```

To run a single test file:
```bash
npx vitest run src/lib/progressLogic.test.ts
```

## Environment Variables

```
VITE_SUPABASE_URL        # Supabase project URL
VITE_SUPABASE_ANON_KEY   # Public Supabase anon key
TMDB_API_KEY             # Server-side only, stored in Supabase edge function env
```

The TMDB API key is never exposed to the frontend — TMDB requests go through the `supabase/functions/tmdb-search` Deno edge function.

## Architecture

### Data Flow

1. **Auth** — `AuthContext` (`src/contexts/AuthContext.tsx`) wraps the app and exposes `useAuth()`. All pages are wrapped in `ProtectedRoute`.
2. **Data fetching** — Custom hooks in `src/hooks/` use TanStack React Query. Query keys follow the pattern `['shows']`, `['rewatches', showId]`, `['progressLogs', rewatchId]`.
3. **Mutations** — Each mutation hook (e.g., `useLogProgress`, `useAddShow`) calls `queryClient.invalidateQueries` on success to keep the UI in sync.
4. **TMDB search** — Frontend calls Supabase edge function (`supabase/functions/tmdb-search`) which proxies to TMDB API with the server-side key.

### Database Schema (Supabase/PostgreSQL)

- **shows** — User's tracked shows with `tmdb_id`, `title`, `poster_url`, `episodes_per_season` (JSON array).
- **rewatches** — Each rewatch session per show (`status: in_progress | completed`, `started_at`, `completed_at`).
- **progress_logs** — Individual episode logs (`season`, `episode`, `logged_at`, `note`).
- **admin_users** — Admin user UUIDs. RLS enabled with no public policies; managed via the Supabase dashboard or service role only.

Row Level Security (RLS) is enabled on all tables — users only see their own rows.

### Progress Logic

`src/lib/progressLogic.ts` contains pure functions for computing current position, completion percentage, and episode backfilling. When a user logs episode N, all prior episodes in that rewatch are automatically backfilled. This logic is unit-tested in `progressLogic.test.ts` — changes here should be covered by tests.

### Key Directories

- `src/hooks/` — All data-fetching and mutation hooks (React Query wrappers around Supabase calls)
- `src/pages/` — Route-level components: `LoginPage`, `RotationPage`, `ShowDetailPage`, `SearchPage`, `AdminPage`
- `src/components/` — Reusable UI (e.g., `ShowCard`, `EpisodePicker`, `LogProgressModal`, `AdminRoute`)
- `src/lib/` — Non-React utilities: `supabase.ts` (client init), `database.types.ts` (generated types), `progressLogic.ts`, `tmdb.ts`
- `src/contexts/` — `AuthContext`
- `supabase/migrations/` — SQL schema and RLS policies
- `supabase/functions/` — Deno edge functions

### Admin Portal

The `/admin` route provides cross-user stats. Access is controlled by the `admin_users` database table.

**Granting admin access:**
```sql
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'someone@example.com';
```

**Revoking admin access:**
```sql
DELETE FROM admin_users
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'someone@example.com');
```

**How it works:**
- `is_admin()` — `SECURITY DEFINER` SQL function; returns `true` if `auth.uid()` is in `admin_users`.
- Three stats functions (`admin_get_overview`, `admin_get_user_list`, `admin_get_popular_shows`) all call `is_admin()` and raise an exception if it returns false.
- Frontend: `useIsAdmin()` hook calls `supabase.rpc('is_admin')`. `AdminRoute` redirects non-admins; the Settings page link is hidden for non-admins.
- The `admin_users` table has RLS enabled with no public policies — clients cannot read or write it directly.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite`. Dark-mode-first design (`#0f0f17` background, purple accents). Mobile-first with safe-area-inset support in `src/index.css`.

### Deployment

Configured for both Vercel (`vercel.json`) and Netlify (`netlify.toml`) with SPA rewrite rules so client-side routing works. Local Supabase emulation requires Docker (`supabase start`).

## Pull Requests

PR titles must follow the [Conventional Commits](https://www.conventionalcommits.org/) format — the `semantic-pr` CI check enforces this. Always prefix the title with a type:

```
feat: add episode quick-log buttons
fix: correct progress backfill edge case
chore: update dependencies
refactor: extract progress logic into hook
docs: update CLAUDE.md
```

Common types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`.

### semantic-release impact

Only `feat:` and `fix:` (and breaking changes via `BREAKING CHANGE:` footer) trigger a release. All other types (`refactor:`, `chore:`, `docs:`, `style:`, `test:`, `perf:`) produce **no release**.

Rule of thumb: if a user can observe the change (new UI, new behaviour, bug gone), use `feat:` or `fix:`. If it is purely internal (code cleanup, tooling, tests), use any other type.
