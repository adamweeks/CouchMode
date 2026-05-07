# CouchMode

A Progressive Web App for tracking TV show rewatches. Search for shows, track your progress episode-by-episode across multiple rewatches, and review your watch history and stats.

## Features

- Search TV shows via TMDB
- Track multiple rewatches per show
- Automatic episode backfilling when logging progress
- Watch history and completion stats
- Dark-mode-first, mobile-friendly UI
- Offline-capable PWA

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [TMDB API key](https://developer.themoviedb.org/docs/getting-started)

## Getting Started

```bash
npm install
```

Copy the environment variables and fill in your values:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> The TMDB API key is stored server-side in the Supabase edge function environment — it is never exposed to the browser.

Apply the database migrations:

```bash
supabase db push
```

Start the dev server:

```bash
npm run dev
```

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |

To run a single test file:

```bash
npx vitest run src/lib/progressLogic.test.ts
```

## Architecture

### Stack

- **Frontend** — React 19, TypeScript, Tailwind CSS v4, Ionic components, React Router v7
- **Data fetching** — TanStack React Query (hooks in `src/hooks/`)
- **Backend** — Supabase (PostgreSQL, Auth, Edge Functions)
- **Build** — Vite, deployed to Vercel or Netlify

### Project Structure

```
src/
  contexts/       AuthContext (useAuth hook)
  hooks/          React Query wrappers for all data fetching and mutations
  pages/          Route-level components (Login, Rotation, Search, ShowDetail, History, Settings)
  components/     Reusable UI (ShowCard, EpisodePicker, LogProgressModal, …)
  lib/            Utilities: supabase client, TMDB client, progressLogic, generated DB types
supabase/
  functions/      Deno edge functions (tmdb-search proxy)
  migrations/     SQL schema and RLS policies
```

### Database Schema

| Table | Description |
|---|---|
| `shows` | Tracked shows with `tmdb_id`, `title`, `poster_url`, `episodes_per_season` |
| `rewatches` | Rewatch sessions per show (`status`: `in_progress` \| `completed`) |
| `progress_logs` | Individual episode logs with optional notes |

Row Level Security is enabled on all tables — users only see their own rows.

### Progress Logic

`src/lib/progressLogic.ts` contains pure functions for computing current position, completion percentage, and episode backfilling. When a user logs episode N, all prior unlogged episodes in that rewatch are automatically backfilled. This module is unit-tested in `progressLogic.test.ts`.

## Deployment

The app is configured for both Vercel and Netlify with SPA rewrite rules for client-side routing.

**Vercel** — import the repo and set the environment variables in the project settings.

**Netlify** — connect the repo; `netlify.toml` handles the build command and redirects.

In either case, also deploy the Supabase edge function and set the `TMDB_API_KEY` secret:

```bash
supabase functions deploy tmdb-search
supabase secrets set TMDB_API_KEY=your-key
```

## Contributing

Pull request titles must follow [Conventional Commits](https://www.conventionalcommits.org/) — the `semantic-pr` CI check enforces this.

```
feat: add episode quick-log buttons
fix: correct progress backfill edge case
chore: update dependencies
```

Common types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`.

## License

Private — all rights reserved.
