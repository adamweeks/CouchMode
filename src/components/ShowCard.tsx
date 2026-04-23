import { Link } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'
import { formatProgress, formatMonthYear } from '../lib/progressLogic'
import type { Database } from '../lib/database.types'
import { useCurrentProgress } from '../hooks/useProgressLogs'
import { useRewatches } from '../hooks/useRewatches'

type Show = Database['public']['Tables']['shows']['Row']

export function ShowCard({ show }: { show: Show }) {
  const { data: rewatches = [] } = useRewatches(show.id)
  const activeRewatch = rewatches.find(r => r.status === 'in_progress') ?? null
  const completedRewatches = rewatches.filter(r => r.status === 'completed')
  const currentProgress = useCurrentProgress(activeRewatch?.id)

  const status = currentProgress ? 'in_progress' : 'not_started'
  const lastCompleted = completedRewatches[0]

  return (
    <Link
      to={`/shows/${show.id}`}
      className="flex gap-3 bg-gray-900 rounded-2xl p-3 active:scale-[0.98] transition-transform hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f17]"
    >
      <img
        src={show.poster_url ?? '/placeholder-poster.svg'}
        alt={show.title}
        className="w-16 h-24 rounded-lg object-cover flex-shrink-0 bg-gray-800"
        loading="lazy"
      />
      <div className="flex flex-col justify-between min-w-0 py-0.5">
        <div>
          <h3 className="font-semibold text-white leading-tight line-clamp-2">{show.title}</h3>
          <div className="mt-1">
            <StatusBadge status={status} />
          </div>
        </div>
        <div className="space-y-0.5">
          {currentProgress && (
            <p className="text-sm text-purple-400 font-medium">
              {formatProgress(currentProgress.season, currentProgress.episode)}
            </p>
          )}
          {lastCompleted?.completed_at && (
            <p className="text-xs text-gray-400">Finished {formatMonthYear(lastCompleted.completed_at)}</p>
          )}
          {completedRewatches.length > 0 && (
            <p className="text-xs text-gray-400">
              {completedRewatches.length} rewatch{completedRewatches.length !== 1 ? 'es' : ''}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
