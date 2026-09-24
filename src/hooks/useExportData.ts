import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  buildViewingCsv,
  buildViewingExport,
  downloadFile,
  exportFilename,
} from '../lib/exportData'
import type { ExportSource } from '../lib/exportData'

export type ExportFormat = 'json' | 'csv'

// PostgREST caps a response at the project's max-rows (1000 by default), and a
// long-time user can easily have more progress logs than that, so page through.
const PAGE_SIZE = 1000

async function fetchAllRows<T extends 'shows' | 'rewatches' | 'progress_logs'>(table: T) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
  }
  return rows
}

export async function fetchExportSource(): Promise<ExportSource> {
  // RLS scopes every table to the signed-in user.
  const [shows, rewatches, progressLogs] = await Promise.all([
    fetchAllRows('shows'),
    fetchAllRows('rewatches'),
    fetchAllRows('progress_logs'),
  ])
  return { shows, rewatches, progressLogs } as ExportSource
}

/** Downloads the signed-in user's full viewing history as JSON or CSV. */
export function useExportData() {
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (format: ExportFormat) => {
      if (!user) throw new Error('Not signed in')
      const data = buildViewingExport(await fetchExportSource())
      if (format === 'json') {
        downloadFile(exportFilename('json'), JSON.stringify(data, null, 2), 'application/json')
      } else {
        // BOM so Excel detects UTF-8 (non-ASCII show titles, emoji in notes).
        downloadFile(exportFilename('csv'), '﻿' + buildViewingCsv(data), 'text/csv;charset=utf-8')
      }
      return data
    },
  })
}
