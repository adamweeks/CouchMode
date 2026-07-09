# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CouchMode is a React + TypeScript PWA for tracking TV show rewatches. Users search shows via TMDB, track progress episode-by-episode across multiple rewatches, view history/stats, and receive AI-powered show suggestions. Backend is Supabase (PostgreSQL + Auth + Edge Functions). The app uses Ionic React for its UI framework, giving it a mobile-native feel.

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
ANTHROPIC_API_KEY        # Server-side only, stored in Supabase edge function env (used by suggest-shows)
```

The TMDB API key and Anthropic API key are never exposed to the frontend — all requests go through Supabase edge functions (Deno runtime).

## Architecture

### Data Flow

1. **Auth** — `AuthContext` (`src/contexts/AuthContext.tsx`) wraps the app and exposes `useAuth()`. All pages are wrapped in `ProtectedRoute`.
2. **Data fetching** — Custom hooks in `src/hooks/` use TanStack React Query. Query keys follow the pattern `['shows', userId]`, `['rewatches', showId]`, `['progress_logs', rewatchId]`, `['resume-show', userId]`, `['suggestions', userId, showTitlesHash]`.
3. **Mutations** — Each mutation hook (e.g., `useLogProgress`, `useAddShow`) calls `queryClient.invalidateQueries` on success to keep the UI in sync.
4. **TMDB search** — Frontend calls Supabase edge function (`supabase/functions/tmdb-search`) which proxies to TMDB API with the server-side key.
5. **AI suggestions** — Frontend calls `supabase/functions/suggest-shows` which uses the Anthropic API (Claude Haiku) to suggest shows based on the user's current library, then resolves titles to TMDB metadata.

### Routing

Routes defined in `src/App.tsx`:
- `/` — `RotationPage` (main show list)
- `/search` — `SearchPage` (TMDB search)
- `/tmdb/:tmdbId` — `ShowDetailPage`
- `/history` — `HistoryPage`
- `/suggestions` — `SuggestionsPage` (AI recommendations)
- `/settings` — `SettingsPage`
- `/admin` — `AdminPage` (admin-only, wrapped in `AdminRoute`)

Navigation between main tabs is handled by `BottomNav` component (custom bottom tab bar using `react-router-dom`).

### Database Schema (Supabase/PostgreSQL)

- **shows** — User's tracked shows: `tmdb_id`, `title`, `poster_url`, `total_seasons`, `episodes_per_season` (integer array), `sort_order` (nullable int for manual queue ordering), `streaming_providers` (JSONB, cached TMDB watch provider data), `providers_updated_at` (timestamp).
- **rewatches** — Each rewatch session per show: `status: in_progress | completed`, `started_at`, `completed_at`, `note`, `service` (streaming service name).
- **progress_logs** — Individual episode logs: `season`, `episode`, `logged_at`, `note`, `rewatch_id`.
- **admin_users** — Admin user UUIDs. RLS enabled with no public policies; managed via the Supabase dashboard or service role only.
- **rate_limit_counters** — Per-user fixed-window rate limit counters for the edge functions. RLS enabled with no public policies; only touched via the `consume_rate_limit()` SECURITY DEFINER function.

Row Level Security (RLS) is enabled on all tables — users only see their own rows, and write policies verify that `show_id`/`rewatch_id` foreign keys reference rows owned by the same user. `progress_logs` has a unique index on `(rewatch_id, season, episode)`; episode logging uses upsert with `ignoreDuplicates` so concurrent logs can't create duplicate rows. `get_rewatch_log_counts()` (SECURITY INVOKER RPC) returns per-rewatch log counts for the calling user — `useShowGroups` uses it instead of fetching raw log rows.

### Progress Logic

`src/lib/progressLogic.ts` contains pure functions for computing current position, completion percentage, and episode backfilling. When a user logs episode N, all prior episodes in that rewatch are automatically backfilled. This logic is unit-tested in `progressLogic.test.ts` — changes here should be covered by tests.

Key exports:
- `getCurrentProgress(logs)` — returns the highest-position log entry
- `isSeriesComplete(season, episode, totalSeasons, episodesPerSeason)` — true when final episode reached
- `getBackfillEntries(...)` — generates missing log rows for all prior episodes
- `buildCompletionUpdates(...)` — builds the rewatch update payload when marking a series finished
- `formatProgress(season, episode)` — returns `"S1 E3"` formatted string
- `formatMonthYear(dateStr)` — returns `"Jun 2026"` formatted string
- `countWatchedEpisodes(episodesPerSeason, progress)` — total episodes watched in a rewatch
- `formatDuration(startedAt, completedAt)` — human-readable duration string

### Streaming Providers

`useRefreshProviders()` in `useShows.ts` checks for stale streaming provider data (older than 7 days) on mount of `RotationPage` and refreshes via TMDB. Provider logos come from `providerLogoUrl()` in `tmdb.ts`. The `ServiceSelector` component (`src/components/ServiceSelector.tsx`) lets users pick a streaming service when logging a rewatch; it surfaces TMDB providers for that show at the top of the list.

### Show Grouping

`useShowGroups()` in `useShows.ts` organizes shows into three groups:
- **Watching** — in-progress rewatches with at least one progress log
- **Up Next** — in-progress rewatches with no logs yet (supports drag-to-reorder via `sort_order`)
- **Done** — shows whose only rewatches are completed

`RotationPage` renders these three groups plus a `ResumeCard` that pinpoints the most recently active show.

### Key Directories

- `src/hooks/` — All data-fetching and mutation hooks (React Query wrappers around Supabase calls)
- `src/pages/` — Route-level components: `LoginPage`, `RotationPage`, `ShowDetailPage`, `SearchPage`, `HistoryPage`, `SettingsPage`, `SuggestionsPage`, `AdminPage`
- `src/components/` — Reusable UI: `ShowCard`, `WatchlistCard`, `ResumeCard`, `LogProgressModal`, `BrowseEpisodesModal`, `MarkFinishedModal`, `EditServiceModal`, `ServiceSelector`, `BottomNav`, `StatusBadge`, `TmdbAttribution`, `AdminRoute`, `ProtectedRoute`
- `src/lib/` — Non-React utilities: `supabase.ts` (client init), `database.types.ts` (generated types), `progressLogic.ts`, `tmdb.ts`
- `src/contexts/` — `AuthContext`, `ThemeContext`
- `src/test/` — Vitest setup, `ionicMock.tsx` (stubs Ionic components for tests), `utils.tsx` (render helpers)
- `supabase/migrations/` — SQL schema and RLS policies
- `supabase/functions/` — Deno edge functions: `tmdb-search`, `suggest-shows`

### Edge Functions

**`supabase/functions/tmdb-search`** — Proxies TMDB API calls:
- `?query=<string>` — text search
- `?tmdb_id=<id>` — show details
- `?tmdb_id=<id>&season=<n>` — season episode list
- `?tmdb_id=<id>&providers=1` — watch providers

**`supabase/functions/suggest-shows`** — AI recommendation pipeline:
1. Receives the user's show titles (up to 30)
2. Calls Claude Haiku to generate 15 title suggestions with short reasons
3. Resolves each title via TMDB search
4. Returns `{ suggestions: [{ tmdb, reason }] }` filtered to deduplicated results

Both functions require a valid Supabase JWT in the `Authorization` header and are rate-limited per user via the `consume_rate_limit()` RPC (`tmdb-search`: 240/hour; `suggest-shows`: 10/day). Exceeding a limit returns HTTP 429. The check fails open if the RPC is missing (e.g. functions deployed before the migration runs).

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

Tailwind CSS v4 via `@tailwindcss/vite`. Ionic React for UI components (`IonPage`, `IonHeader`, `IonList`, `IonItem`, etc.). Light and dark themes: `ThemeContext` (`src/contexts/ThemeContext.tsx`) follows the device `prefers-color-scheme` by default with a manual System/Light/Dark override in Settings, persisted to localStorage (`couchmode-theme`). The resolved theme toggles a `.dark` class on `<html>`; all theme values are CSS variables in `src/theme/variables.css` (light in `:root`, dark overrides in `:root.dark` — dark background `#0f0f17`). An inline script in `index.html` applies the class pre-hydration to avoid a theme flash. Mobile-first with `env(safe-area-inset-bottom)` support in `src/index.css`. The `gradient-header` and `gradient-searchbar` CSS classes are defined in the global stylesheet. App version is injected at build time as `__APP_VERSION__` global (defined in `vite.config.ts` and `vitest.config.ts`).

### Testing

Tests use Vitest + jsdom + `@testing-library/react`. Ionic components are mocked via `src/test/ionicMock.tsx` (aliased in `vitest.config.ts`). Supabase and TMDB calls are mocked per test file using `vi.mock`. Test utilities in `src/test/utils.tsx` provide a `renderWithProviders` helper that wraps components in `QueryClientProvider` and `AuthProvider`.

Tests exist for:
- `src/lib/progressLogic.test.ts` — pure logic unit tests (most comprehensive)
- `src/lib/tmdb.test.ts` — TMDB fetch functions
- `src/hooks/useProgressLogs.test.ts`, `useRewatches.test.ts`, `useShows.test.ts`, `useTMDBSeason.test.ts`, `useTMDBShow.test.ts`, `useDebounce.test.ts`
- `src/components/AppTabBar.test.tsx`, `ProtectedRoute.test.tsx`, `StatusBadge.test.tsx`
- `src/contexts/AuthContext.test.tsx`
- `src/pages/HistoryPage.test.tsx`, `LoginPage.test.tsx`, `RotationPage.test.tsx`, `SearchPage.test.tsx`, `SettingsPage.test.tsx`, `ShowDetailPage.test.tsx`

When adding new logic to `progressLogic.ts`, add corresponding unit tests.

### Deployment

Configured for both Vercel (`vercel.json`) and Netlify (`netlify.toml`) with SPA rewrite rules so client-side routing works. Local Supabase emulation requires Docker (`supabase start`). The app is a PWA with offline support via Workbox (caches TMDB images with `CacheFirst`).

### CI/CD

Three GitHub Actions workflows:
- **`test.yml`** — runs `npm test` on PRs
- **`lint-pr.yml`** — validates PR title against Conventional Commits (`semantic-pr` check)
- **`release.yml`** — runs `semantic-release` on pushes to `main`, creating GitHub releases and bumping `package.json` version

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
