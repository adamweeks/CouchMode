export interface LogEntry {
  id: string
  season: number
  episode: number
  logged_at: string
}

export interface NewLogEntry {
  rewatch_id: string
  user_id: string
  season: number
  episode: number
  logged_at: string
  note?: string | null
}

export function comparePosition(a: { season: number; episode: number }, b: { season: number; episode: number }): number {
  if (a.season !== b.season) return a.season - b.season
  return a.episode - b.episode
}

export function getCurrentProgress(logs: LogEntry[]): LogEntry | null {
  if (!logs.length) return null
  return logs.reduce((best, log) => comparePosition(log, best) > 0 ? log : best)
}

export function isRegression(
  targetSeason: number,
  targetEpisode: number,
  current: LogEntry | null
): boolean {
  if (!current) return false
  return comparePosition({ season: targetSeason, episode: targetEpisode }, current) < 0
}

export function isSeriesComplete(
  targetSeason: number,
  targetEpisode: number,
  totalSeasons: number,
  episodesPerSeason: number[]
): boolean {
  if (targetSeason !== totalSeasons) return false
  const lastEpisode = episodesPerSeason[totalSeasons - 1]
  return targetEpisode >= lastEpisode
}

export function getNextEpisode(
  currentProgress: { season: number; episode: number } | null | undefined,
  totalSeasons: number,
  episodesPerSeason: number[]
): { season: number; episode: number } | null {
  if (!currentProgress) {
    for (let s = 1; s <= totalSeasons; s++) {
      if ((episodesPerSeason[s - 1] ?? 0) > 0) return { season: s, episode: 1 }
    }
    return { season: 1, episode: 1 }
  }

  const maxEp = episodesPerSeason[currentProgress.season - 1] ?? 1
  if (currentProgress.episode < maxEp) {
    return { season: currentProgress.season, episode: currentProgress.episode + 1 }
  }

  for (let s = currentProgress.season + 1; s <= totalSeasons; s++) {
    if ((episodesPerSeason[s - 1] ?? 0) > 0) return { season: s, episode: 1 }
  }

  return null
}

export function getBackfillEntries(
  targetSeason: number,
  targetEpisode: number,
  episodesPerSeason: number[],
  existingLogs: Set<string>,
  rewatchId: string,
  userId: string,
  now: string
): NewLogEntry[] {
  const entries: NewLogEntry[] = []

  for (let s = 1; s < targetSeason; s++) {
    const count = episodesPerSeason[s - 1] ?? 0
    for (let e = 1; e <= count; e++) {
      if (!existingLogs.has(`${s}x${e}`)) {
        entries.push({ rewatch_id: rewatchId, user_id: userId, season: s, episode: e, logged_at: now })
      }
    }
  }

  for (let e = 1; e < targetEpisode; e++) {
    if (!existingLogs.has(`${targetSeason}x${e}`)) {
      entries.push({ rewatch_id: rewatchId, user_id: userId, season: targetSeason, episode: e, logged_at: now })
    }
  }

  return entries
}

export interface CompletionUpdates {
  completed_at: string
  status: 'completed'
  note: string | null
  started_at?: string
}

export function buildCompletionUpdates(
  completedAt: string,
  currentStartedAt: string,
  startedAt?: string,
  note?: string
): CompletionUpdates {
  const base: CompletionUpdates = {
    completed_at: completedAt,
    status: 'completed',
    note: note ?? null,
  }
  if (startedAt) return { ...base, started_at: startedAt }
  if (new Date(completedAt) < new Date(currentStartedAt)) return { ...base, started_at: completedAt }
  return base
}

export function formatProgress(season: number, episode: number): string {
  return `S${season} E${episode}`
}

const monthYearFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' })

export function formatMonthYear(dateStr: string): string {
  return monthYearFormatter.format(new Date(dateStr))
}

export function countWatchedEpisodes(
  episodesPerSeason: number[],
  progress: { season: number; episode: number }
): number {
  return episodesPerSeason.slice(0, progress.season - 1).reduce((s, n) => s + n, 0) + progress.episode
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}

export function formatDuration(startedAt: string, completedAt: string): string {
  const days = Math.round(
    (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (days === 0) return 'Same day'
  if (days === 1) return '1 day'
  return `${days} days`
}

export interface AirEpisode {
  season: number
  episode: number
  air_date: string | null
}

/**
 * Cached air-schedule snapshot for a show, derived from TMDB's `status`,
 * `last_episode_to_air`, and `next_episode_to_air`. Stored as JSONB on the
 * `shows` row and refreshed on the same cadence as streaming providers.
 */
export interface AirStatus {
  status: string | null
  last_aired: AirEpisode | null
  next_episode: AirEpisode | null
}

// TMDB series statuses that mean more episodes are expected. "Returning
// Series" is the common one; the others cover shows that have been renewed or
// are still in their first run.
const RETURNING_STATUSES = new Set(['returning series', 'in production', 'pilot', 'planned'])

export function isReturningSeries(air: AirStatus | null | undefined): boolean {
  if (!air) return false
  if (air.next_episode) return true
  return RETURNING_STATUSES.has((air.status ?? '').toLowerCase())
}

/**
 * True when the viewer has watched up to (or past) the most recent aired
 * episode of a show that is still returning — i.e. they're waiting on new
 * episodes rather than having episodes ready to watch right now.
 */
export function isCaughtUp(
  current: { season: number; episode: number } | null | undefined,
  air: AirStatus | null | undefined
): boolean {
  if (!current || !isReturningSeries(air)) return false
  const last = air!.last_aired
  if (!last) return false
  return comparePosition(current, { season: last.season, episode: last.episode }) >= 0
}

const airDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

// Whole calendar days from `now` until `dateStr` (YYYY-MM-DD). Negative when
// the date is in the past. Compared at local midnight so "today" is 0.
function daysUntil(dateStr: string, now: Date): number {
  const target = new Date(`${dateStr}T00:00:00`)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

/**
 * Human-readable air-status line for a caught-up show. Prefers the upcoming
 * episode ("Next: S2 E1 · in 3 days"); otherwise describes the most recent
 * one ("New episode aired 2 days ago · S2 E1"). Returns a bare "Caught up"
 * when no useful date is available, or null when there's no air data at all.
 */
export function formatAirStatus(air: AirStatus | null | undefined, now: Date = new Date()): string | null {
  if (!air) return null

  const next = air.next_episode
  if (next?.air_date) {
    const days = daysUntil(next.air_date, now)
    const ep = formatProgress(next.season, next.episode)
    if (days <= 0) return `New episode out now · ${ep}`
    const when =
      days === 1
        ? 'tomorrow'
        : days <= 7
        ? `in ${days} days`
        : airDateFormatter.format(new Date(`${next.air_date}T00:00:00`))
    return `Next: ${ep} · ${when}`
  }

  const last = air.last_aired
  if (last?.air_date) {
    const days = daysUntil(last.air_date, now) // 0 or negative
    if (days >= -10) {
      const ep = formatProgress(last.season, last.episode)
      const when = days === 0 ? 'today' : days === -1 ? 'yesterday' : `${-days} days ago`
      return `New episode aired ${when} · ${ep}`
    }
  }

  return 'Caught up'
}
