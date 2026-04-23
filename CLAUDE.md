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

Row Level Security (RLS) is enabled on all tables — users only see their own rows.

### Progress Logic

`src/lib/progressLogic.ts` contains pure functions for computing current position, completion percentage, and episode backfilling. When a user logs episode N, all prior episodes in that rewatch are automatically backfilled. This logic is unit-tested in `progressLogic.test.ts` — changes here should be covered by tests.

### Key Directories

- `src/hooks/` — All data-fetching and mutation hooks (React Query wrappers around Supabase calls)
- `src/pages/` — Route-level components: `LoginPage`, `RotationPage`, `ShowDetailPage`, `SearchPage`
- `src/components/` — Reusable UI (e.g., `ShowCard`, `EpisodePicker`, `LogProgressModal`)
- `src/lib/` — Non-React utilities: `supabase.ts` (client init), `database.types.ts` (generated types), `progressLogic.ts`, `tmdb.ts`
- `src/contexts/` — `AuthContext`
- `supabase/migrations/` — SQL schema and RLS policies
- `supabase/functions/` — Deno edge functions

### Styling

Tailwind CSS v4 via `@tailwindcss/vite`. Dark-mode-first design (`#0f0f17` background, purple accents). Mobile-first with safe-area-inset support in `src/index.css`.

### Deployment

Configured for both Vercel (`vercel.json`) and Netlify (`netlify.toml`) with SPA rewrite rules so client-side routing works. Local Supabase emulation requires Docker (`supabase start`).
