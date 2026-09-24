import { describe, it, expect } from 'vitest'
import {
  buildViewingCsv,
  buildViewingExport,
  CSV_COLUMNS,
  escapeCsvCell,
  exportFilename,
} from './exportData'
import type { ExportSource } from './exportData'

const base = { user_id: 'u1' }

function makeSource(): ExportSource {
  return {
    shows: [
      {
        ...base,
        id: 's-wire',
        title: 'The Wire',
        tmdb_id: '1438',
        total_seasons: 5,
        episodes_per_season: [13, 12, 12, 13, 10],
        added_at: '2026-01-01T00:00:00.000Z',
        poster_url: '/wire.jpg',
        sort_order: null,
        streaming_providers: { flatrate: [] },
        providers_updated_at: null,
        air_status: null,
        air_status_updated_at: null,
      },
      {
        ...base,
        id: 's-bb',
        title: 'Breaking Bad',
        tmdb_id: '1396',
        total_seasons: 5,
        episodes_per_season: [7, 13, 13, 13, 16],
        added_at: '2026-02-01T00:00:00.000Z',
        poster_url: null,
        sort_order: 1,
        streaming_providers: null,
        providers_updated_at: null,
        air_status: null,
        air_status_updated_at: null,
      },
    ],
    rewatches: [
      {
        ...base,
        id: 'r-bb-2',
        show_id: 's-bb',
        status: 'in_progress',
        started_at: '2026-06-01T00:00:00.000Z',
        completed_at: null,
        note: null,
        service: 'Netflix',
      },
      {
        ...base,
        id: 'r-bb-1',
        show_id: 's-bb',
        status: 'completed',
        started_at: '2026-03-01T00:00:00.000Z',
        completed_at: '2026-04-01T00:00:00.000Z',
        note: 'First time, loved it',
        service: null,
      },
    ],
    progressLogs: [
      { ...base, id: 'l2', rewatch_id: 'r-bb-2', season: 1, episode: 2, logged_at: '2026-06-02T00:00:00.000Z', note: 'Great, "classic"' },
      { ...base, id: 'l1', rewatch_id: 'r-bb-2', season: 1, episode: 1, logged_at: '2026-06-01T00:00:00.000Z', note: null },
    ],
  }
}

describe('buildViewingExport', () => {
  const exportedAt = new Date('2026-09-24T12:00:00.000Z')

  it('nests shows → rewatches → episodes, sorted, without internal fields', () => {
    const result = buildViewingExport(makeSource(), exportedAt)

    expect(result.app).toBe('CouchMode')
    expect(result.format_version).toBe(1)
    expect(result.exported_at).toBe('2026-09-24T12:00:00.000Z')
    expect(result.shows.map(s => s.title)).toEqual(['Breaking Bad', 'The Wire'])

    const bb = result.shows[0]
    expect(bb).not.toHaveProperty('id')
    expect(bb).not.toHaveProperty('user_id')
    expect(bb).not.toHaveProperty('streaming_providers')
    expect(bb.rewatches.map(r => [r.rewatch_number, r.status])).toEqual([
      [1, 'completed'],
      [2, 'in_progress'],
    ])
    expect(bb.rewatches[1].service).toBe('Netflix')
    expect(bb.rewatches[1].episodes).toEqual([
      { season: 1, episode: 1, logged_at: '2026-06-01T00:00:00.000Z', note: null },
      { season: 1, episode: 2, logged_at: '2026-06-02T00:00:00.000Z', note: 'Great, "classic"' },
    ])
    expect(result.shows[1].rewatches).toEqual([])
  })

  it('handles an empty library', () => {
    const result = buildViewingExport({ shows: [], rewatches: [], progressLogs: [] }, exportedAt)
    expect(result.shows).toEqual([])
  })
})

describe('buildViewingCsv', () => {
  it('emits a header, one row per episode, and placeholder rows for empty rewatches/shows', () => {
    const csv = buildViewingCsv(buildViewingExport(makeSource()))
    const lines = csv.trimEnd().split('\r\n')

    expect(lines[0]).toBe(CSV_COLUMNS.join(','))
    expect(lines).toHaveLength(1 + 1 + 2 + 1)
    // Completed rewatch with no logs → one row, blank episode columns.
    expect(lines[1]).toBe(
      'Breaking Bad,1396,1,completed,,2026-03-01T00:00:00.000Z,2026-04-01T00:00:00.000Z,"First time, loved it",,,,',
    )
    expect(lines[2]).toBe(
      'Breaking Bad,1396,2,in_progress,Netflix,2026-06-01T00:00:00.000Z,,,1,1,2026-06-01T00:00:00.000Z,',
    )
    expect(lines[3]).toContain(',1,2,2026-06-02T00:00:00.000Z,"Great, ""classic"""')
    // Show with no rewatches still appears.
    expect(lines[4]).toBe('The Wire,1438,,,,,,,,,,')
  })

  it('outputs only the header for an empty library', () => {
    expect(buildViewingCsv(buildViewingExport({ shows: [], rewatches: [], progressLogs: [] }))).toBe(
      CSV_COLUMNS.join(',') + '\r\n',
    )
  })
})

describe('escapeCsvCell', () => {
  it('leaves plain values alone and blanks null/undefined', () => {
    expect(escapeCsvCell('Lost')).toBe('Lost')
    expect(escapeCsvCell(3)).toBe('3')
    expect(escapeCsvCell(null)).toBe('')
    expect(escapeCsvCell(undefined)).toBe('')
  })

  it('quotes commas, quotes, and newlines', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""')
    expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"')
  })

  it('neutralises spreadsheet formula triggers in text', () => {
    expect(escapeCsvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(escapeCsvCell('+1')).toBe("'+1")
    expect(escapeCsvCell('@me')).toBe("'@me")
    expect(escapeCsvCell(-1)).toBe('-1')
  })
})

describe('exportFilename', () => {
  it('uses the local date', () => {
    expect(exportFilename('json', new Date(2026, 8, 4, 23, 30))).toBe('couchmode-export-2026-09-04.json')
    expect(exportFilename('csv', new Date(2026, 11, 31))).toBe('couchmode-export-2026-12-31.csv')
  })
})
