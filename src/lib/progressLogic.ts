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
