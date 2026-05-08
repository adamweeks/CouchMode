import { describe, it, expect } from 'vitest'
import {
  comparePosition,
  getCurrentProgress,
  getBackfillEntries,
  isSeriesComplete,
  isRegression,
  buildCompletionUpdates,
  formatProgress,
  formatMonthYear,
  formatDuration,
  getErrorMessage,
} from './progressLogic'

describe('getCurrentProgress', () => {
  it('returns null for empty logs', () => {
    expect(getCurrentProgress([])).toBeNull()
  })

  it('returns the highest season/episode', () => {
    const logs = [
      { id: '1', season: 1, episode: 3, logged_at: '' },
      { id: '2', season: 2, episode: 1, logged_at: '' },
      { id: '3', season: 1, episode: 22, logged_at: '' },
    ]
    const result = getCurrentProgress(logs)
    expect(result?.season).toBe(2)
    expect(result?.episode).toBe(1)
  })

  it('uses position not timestamp', () => {
    const logs = [
      { id: '1', season: 3, episode: 5, logged_at: '2024-01-03' },
      { id: '2', season: 3, episode: 10, logged_at: '2024-01-01' },
    ]
    const result = getCurrentProgress(logs)
    expect(result?.episode).toBe(10)
  })
})

describe('getBackfillEntries', () => {
  const rewatchId = 'rw1'
  const userId = 'u1'
  const now = '2024-01-01T00:00:00Z'
  const eps = [6, 13, 8]

  it('backfills all episodes before target across seasons', () => {
    const existing = new Set<string>()
    const entries = getBackfillEntries(2, 3, eps, existing, rewatchId, userId, now)
    // Season 1: 6 episodes; Season 2: episodes 1 and 2 (before ep 3)
    expect(entries.length).toBe(8)
    expect(entries.some(e => e.season === 1 && e.episode === 1)).toBe(true)
    expect(entries.some(e => e.season === 1 && e.episode === 6)).toBe(true)
    expect(entries.some(e => e.season === 2 && e.episode === 2)).toBe(true)
    expect(entries.some(e => e.season === 2 && e.episode === 3)).toBe(false)
  })

  it('skips already logged episodes', () => {
    const existing = new Set(['1x1', '1x2', '1x3'])
    const entries = getBackfillEntries(1, 5, eps, existing, rewatchId, userId, now)
    // Should only add 1x4 (1x5 is the target, not backfilled)
    expect(entries.length).toBe(1)
    expect(entries[0]).toMatchObject({ season: 1, episode: 4 })
  })

  it('returns empty when logging S1E1', () => {
    const entries = getBackfillEntries(1, 1, eps, new Set(), rewatchId, userId, now)
    expect(entries.length).toBe(0)
  })
})

describe('isSeriesComplete', () => {
  const eps = [6, 13, 8]

  it('returns true when logging last episode of last season', () => {
    expect(isSeriesComplete(3, 8, 3, eps)).toBe(true)
  })

  it('returns false for middle episode', () => {
    expect(isSeriesComplete(3, 5, 3, eps)).toBe(false)
  })

  it('returns false for last episode of non-last season', () => {
    expect(isSeriesComplete(2, 13, 3, eps)).toBe(false)
  })
})

describe('isRegression', () => {
  const current = { id: '1', season: 2, episode: 5, logged_at: '' }

  it('returns true when logging earlier position', () => {
    expect(isRegression(1, 3, current)).toBe(true)
    expect(isRegression(2, 3, current)).toBe(true)
  })

  it('returns false when logging later position', () => {
    expect(isRegression(2, 6, current)).toBe(false)
    expect(isRegression(3, 1, current)).toBe(false)
  })

  it('returns false when null (no progress yet)', () => {
    expect(isRegression(1, 1, null)).toBe(false)
  })
})

describe('buildCompletionUpdates', () => {
  const completedAt = '2026-04-01T12:00:00Z'
  const currentStartedAt = '2026-01-01T12:00:00Z'

  it('always sets status to completed and completed_at to the given date', () => {
    const result = buildCompletionUpdates(completedAt, currentStartedAt)
    expect(result.status).toBe('completed')
    expect(result.completed_at).toBe(completedAt)
  })

  it('sets note to null when not provided', () => {
    const result = buildCompletionUpdates(completedAt, currentStartedAt)
    expect(result.note).toBeNull()
  })

  it('includes note when provided', () => {
    const result = buildCompletionUpdates(completedAt, currentStartedAt, undefined, 'Great rewatch')
    expect(result.note).toBe('Great rewatch')
  })

  it('uses explicit startedAt when provided', () => {
    const startedAt = '2026-02-01T12:00:00Z'
    const result = buildCompletionUpdates(completedAt, currentStartedAt, startedAt)
    expect(result.started_at).toBe(startedAt)
  })

  it('uses completedAt as started_at when completedAt is before currentStartedAt', () => {
    const pastCompleted = '2025-12-01T12:00:00Z'
    const result = buildCompletionUpdates(pastCompleted, currentStartedAt)
    expect(result.started_at).toBe(pastCompleted)
  })

  it('omits started_at when completedAt is after currentStartedAt and no startedAt given', () => {
    const result = buildCompletionUpdates(completedAt, currentStartedAt)
    expect(result.started_at).toBeUndefined()
  })

  it('prefers explicit startedAt over the backdating fallback', () => {
    const pastCompleted = '2025-12-01T12:00:00Z'
    const explicitStart = '2025-11-01T12:00:00Z'
    const result = buildCompletionUpdates(pastCompleted, currentStartedAt, explicitStart)
    expect(result.started_at).toBe(explicitStart)
  })
})

describe('comparePosition', () => {
  it('returns negative when a has lower episode in same season', () => {
    expect(comparePosition({ season: 2, episode: 3 }, { season: 2, episode: 5 })).toBeLessThan(0)
  })

  it('returns positive when a has higher season', () => {
    expect(comparePosition({ season: 3, episode: 1 }, { season: 2, episode: 10 })).toBeGreaterThan(0)
  })

  it('returns 0 when positions are equal', () => {
    expect(comparePosition({ season: 1, episode: 4 }, { season: 1, episode: 4 })).toBe(0)
  })

  it('considers season before episode', () => {
    // S2E1 > S1E99
    expect(comparePosition({ season: 2, episode: 1 }, { season: 1, episode: 99 })).toBeGreaterThan(0)
  })
})

describe('formatProgress', () => {
  it('formats season 1 episode 5 correctly', () => {
    expect(formatProgress(1, 5)).toBe('S1 E5')
  })

  it('formats season 3 episode 10 correctly', () => {
    expect(formatProgress(3, 10)).toBe('S3 E10')
  })
})

describe('formatMonthYear', () => {
  it('formats January 2024', () => {
    const result = formatMonthYear('2024-01-15')
    expect(result).toContain('Jan')
    expect(result).toContain('2024')
  })

  it('formats December 2026', () => {
    const result = formatMonthYear('2026-12-01')
    expect(result).toContain('Dec')
    expect(result).toContain('2026')
  })
})

describe('formatDuration', () => {
  it('returns "Same day" when start and end are at the same timestamp', () => {
    expect(formatDuration('2024-03-10T00:00:00Z', '2024-03-10T00:00:00Z')).toBe('Same day')
  })

  it('returns "1 day" for exactly one day apart', () => {
    expect(formatDuration('2024-03-10T00:00:00Z', '2024-03-11T00:00:00Z')).toBe('1 day')
  })

  it('returns plural days for multiple days', () => {
    expect(formatDuration('2024-03-01T00:00:00Z', '2024-03-06T00:00:00Z')).toBe('5 days')
  })
})

describe('getErrorMessage', () => {
  it('extracts message from Error instances', () => {
    expect(getErrorMessage(new Error('oops'))).toBe('oops')
  })

  it('returns fallback for plain strings', () => {
    expect(getErrorMessage('some string')).toBe('Something went wrong')
  })

  it('returns fallback for null', () => {
    expect(getErrorMessage(null)).toBe('Something went wrong')
  })

  it('returns fallback for plain objects', () => {
    expect(getErrorMessage({ message: 'not an error' })).toBe('Something went wrong')
  })
})
