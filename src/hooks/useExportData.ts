import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Tables } from '../lib/database.types'
import {
  buildViewingCsv,
  buildViewingExport,
  exportFilename,
  saveFile,
} from '../lib/exportData'
import type { ExportSource } from '../lib/exportData'

export type ExportFormat = 'json' | 'csv'

type ExportTable = 'shows' | 'rewatches' | 'progress_logs'

// PostgREST caps each response (max-rows, 1000 by default), and a long-time
// user can easily have more progress logs than that, so page through.
export const EXPORT_PAGE_SIZE = 1000

/**
 * Reads every row of `table` visible to the user (RLS scopes it to their own).
 * Keyset-paginates on `id` and stops only on an empty page, so a server
 * max-rows below the page size can't truncate the export, and rows added or
 * deleted mid-export can't shift others between pages.
 */
export async function fetchAllRows<T extends ExportTable>(table: T): Promise<Tables<T>[]> {
  const rows: Tables<T>[] = []
  let lastId: string | null = null
  for (;;) {
    let query = supabase.from(table).select('*').order('id', { ascending: true }).limit(EXPORT_PAGE_SIZE)
    if (lastId) query = query.gt('id', lastId)
    const { data, error } = await query
    if (error) throw error
    const page = data as Tables<T>[]
    if (page.length === 0) return rows
    rows.push(...page)
    lastId = page[page.length - 1].id
  }
}

export async function fetchExportSource(): Promise<ExportSource> {
  const [shows, rewatches, progressLogs] = await Promise.all([
    fetchAllRows('shows'),
    fetchAllRows('rewatches'),
    fetchAllRows('progress_logs'),
  ])
  return { shows, rewatches, progressLogs }
}

/** Downloads (or, on touch devices, shares) the user's full viewing history. */
export function useExportData() {
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (format: ExportFormat): Promise<void> => {
      if (!user) throw new Error('Not signed in')
      const data = buildViewingExport(await fetchExportSource())
      if (format === 'json') {
        await saveFile(exportFilename('json'), JSON.stringify(data, null, 2), 'application/json')
      } else {
        // BOM so Excel detects UTF-8 (non-ASCII show titles, emoji in notes).
        await saveFile(exportFilename('csv'), '\uFEFF' + buildViewingCsv(data), 'text/csv;charset=utf-8')
      }
    },
  })
}
