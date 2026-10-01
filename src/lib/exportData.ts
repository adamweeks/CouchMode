import type { Database } from './database.types'
import { comparePosition } from './progressLogic'

type Show = Database['public']['Tables']['shows']['Row']
type Rewatch = Database['public']['Tables']['rewatches']['Row']
type ProgressLog = Database['public']['Tables']['progress_logs']['Row']

export interface ExportSource {
  shows: Show[]
  rewatches: Rewatch[]
  progressLogs: ProgressLog[]
}

export interface ExportedEpisode {
  season: number
  episode: number
  logged_at: string
  note: string | null
}

export interface ExportedRewatch {
  rewatch_number: number
  status: Rewatch['status']
  service: string | null
  started_at: string
  completed_at: string | null
  note: string | null
  episodes: ExportedEpisode[]
}

export interface ExportedShow {
  title: string
  tmdb_id: string
  total_seasons: number
  episodes_per_season: number[]
  added_at: string
  rewatches: ExportedRewatch[]
}

export interface ViewingDataExport {
  app: 'CouchMode'
  format_version: 1
  exported_at: string
  shows: ExportedShow[]
}

/**
 * Nests the user's flat table rows into a portable show → rewatch → episode
 * tree. Internal ids, user ids, and cached TMDB metadata (providers, air
 * status) are left out — only what the user actually recorded is exported.
 * Shows are ordered by title, rewatches oldest first, episodes by season and
 * episode (not `logged_at` — backfilled episodes share one timestamp).
 */
export function buildViewingExport(
  { shows, rewatches, progressLogs }: ExportSource,
  exportedAt: Date = new Date(),
): ViewingDataExport {
  const logsByRewatch = new Map<string, ProgressLog[]>()
  for (const log of progressLogs) {
    const list = logsByRewatch.get(log.rewatch_id)
    if (list) list.push(log)
    else logsByRewatch.set(log.rewatch_id, [log])
  }

  const rewatchesByShow = new Map<string, Rewatch[]>()
  for (const rewatch of rewatches) {
    const list = rewatchesByShow.get(rewatch.show_id)
    if (list) list.push(rewatch)
    else rewatchesByShow.set(rewatch.show_id, [rewatch])
  }

  const exportedShows = [...shows]
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((show): ExportedShow => {
      const showRewatches = [...(rewatchesByShow.get(show.id) ?? [])].sort((a, b) =>
        a.started_at.localeCompare(b.started_at),
      )
      return {
        title: show.title,
        tmdb_id: show.tmdb_id,
        total_seasons: show.total_seasons,
        episodes_per_season: show.episodes_per_season,
        added_at: show.added_at,
        rewatches: showRewatches.map((rewatch, index) => ({
          rewatch_number: index + 1,
          status: rewatch.status,
          service: rewatch.service,
          started_at: rewatch.started_at,
          completed_at: rewatch.completed_at,
          note: rewatch.note,
          episodes: [...(logsByRewatch.get(rewatch.id) ?? [])]
            .sort(comparePosition)
            .map(log => ({
              season: log.season,
              episode: log.episode,
              logged_at: log.logged_at,
              note: log.note,
            })),
        })),
      }
    })

  return {
    app: 'CouchMode',
    format_version: 1,
    exported_at: exportedAt.toISOString(),
    shows: exportedShows,
  }
}

export const CSV_COLUMNS = [
  'show_title',
  'tmdb_id',
  'rewatch_number',
  'rewatch_status',
  'service',
  'rewatch_started_at',
  'rewatch_completed_at',
  'rewatch_note',
  'season',
  'episode',
  'logged_at',
  'episode_note',
] as const

/**
 * Escapes one CSV cell (RFC 4180). Values starting with a spreadsheet formula
 * trigger are prefixed with `'` so user-entered notes can't execute as
 * formulas when the file is opened in Excel/Sheets.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

/**
 * Flattens an export into a CSV with one row per logged episode. Rewatches
 * with no logged episodes, and shows with no rewatches, still get a single
 * row (with the episode columns blank) so nothing in the library is dropped.
 */
export function buildViewingCsv(data: ViewingDataExport): string {
  const rows: (string | number | null)[][] = []
  for (const show of data.shows) {
    if (show.rewatches.length === 0) {
      rows.push([show.title, show.tmdb_id, null, null, null, null, null, null, null, null, null, null])
      continue
    }
    for (const rewatch of show.rewatches) {
      const rewatchCells = [
        show.title,
        show.tmdb_id,
        rewatch.rewatch_number,
        rewatch.status,
        rewatch.service,
        rewatch.started_at,
        rewatch.completed_at,
        rewatch.note,
      ]
      if (rewatch.episodes.length === 0) {
        rows.push([...rewatchCells, null, null, null, null])
        continue
      }
      for (const ep of rewatch.episodes) {
        rows.push([...rewatchCells, ep.season, ep.episode, ep.logged_at, ep.note])
      }
    }
  }
  return [CSV_COLUMNS.join(','), ...rows.map(row => row.map(escapeCsvCell).join(','))].join('\r\n') + '\r\n'
}

/** `couchmode-export-2026-09-24.json` — date in the user's local time zone. */
export function exportFilename(extension: 'json' | 'csv', date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `couchmode-export-${y}-${m}-${d}.${extension}`
}

// Long enough for WebKit, which starts blob downloads asynchronously and fails
// ("WebKitBlobResource error 1") if the object URL is revoked too soon.
const REVOKE_DELAY_MS = 60_000

function downloadViaLink(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}

/**
 * Hands `content` to the user as a file. On touch devices that can share files
 * (iOS/Android, including the installed PWA, where `<a download>` is
 * unreliable) this opens the native share sheet so they can save it to Files,
 * AirDrop it, etc. Everywhere else — or if sharing isn't allowed, e.g. the tap's
 * user activation expired while the data loaded — it falls back to a download.
 * Resolves quietly if the user dismisses the share sheet.
 */
export async function saveFile(filename: string, content: string, mimeType: string): Promise<void> {
  const blob = new Blob([content], { type: mimeType })
  const file = typeof File === 'function' ? new File([blob], filename, { type: mimeType }) : null
  const touch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  if (file && touch && typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      // NotAllowedError etc. → fall through to a regular download.
    }
  }
  downloadViaLink(filename, blob)
}
