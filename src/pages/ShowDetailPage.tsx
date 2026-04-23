import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useShow } from '../hooks/useShows'
import { useRewatches, useActiveRewatch } from '../hooks/useRewatches'
import { useCurrentProgress } from '../hooks/useProgressLogs'
import { useRemoveShow } from '../hooks/useShows'
import { LogProgressModal } from '../components/LogProgressModal'
import { MarkFinishedModal } from '../components/MarkFinishedModal'
import { StatusBadge } from '../components/StatusBadge'
import { formatProgress, formatDuration, formatMonthYear } from '../lib/progressLogic'

type Rewatch = { id: string; completed_at: string | null; started_at: string; note: string | null; status: string }

function avgDaysBetweenRewatches(rewatches: Rewatch[]): number | null {
  if (rewatches.length < 2) return null
  const dates = rewatches
    .map(r => new Date(r.completed_at!).getTime())
    .sort((a, b) => a - b)
  let total = 0
  for (let i = 1; i < dates.length; i++) total += dates[i] - dates[i - 1]
  return Math.round(total / (dates.length - 1) / (1000 * 60 * 60 * 24))
}

export function ShowDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showLogModal, setShowLogModal] = useState(false)
  const [showFinishedModal, setShowFinishedModal] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

  const { data: show, isLoading } = useShow(id!)
  const { data: rewatches = [] } = useRewatches(id!)
  const { data: activeRewatch } = useActiveRewatch(id!)
  const currentProgress = useCurrentProgress(activeRewatch?.id)
  const removeShow = useRemoveShow()

  if (isLoading) {
    return (
      <div className="flex justify-center pt-16">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!show) return <div className="p-4 text-gray-400">Show not found</div>

  const completedRewatches = rewatches.filter(r => r.status === 'completed')
  const status = currentProgress ? 'in_progress' : 'not_started'
  const avgDays = avgDaysBetweenRewatches(completedRewatches)

  return (
    <div className="flex flex-col min-h-screen pb-[env(safe-area-inset-bottom)]">
      <header className="px-4 pt-12 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-300 flex-shrink-0"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-white line-clamp-1">{show.title}</h1>
      </header>

      <div className="px-4 flex gap-4 pb-4">
        <img
          src={show.poster_url ?? '/placeholder-poster.svg'}
          alt={show.title}
          className="w-24 h-36 rounded-xl object-cover flex-shrink-0 bg-gray-800"
        />
        <div className="flex flex-col justify-between py-1">
          <div className="space-y-2">
            <StatusBadge status={status} />
            {currentProgress ? (
              <p className="text-2xl font-bold text-white">
                {formatProgress(currentProgress.season, currentProgress.episode)}
              </p>
            ) : (
              <p className="text-gray-500 text-sm">Not started yet</p>
            )}
            <p className="text-xs text-gray-500">{show.total_seasons} season{show.total_seasons !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLogModal(true)}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-xl font-medium active:scale-95 transition-transform min-h-[44px]"
            >
              Log Progress
            </button>
            <button
              onClick={() => setShowFinishedModal(true)}
              className="px-4 py-2 bg-green-700 text-white text-sm rounded-xl font-medium active:scale-95 transition-transform min-h-[44px]"
            >
              Finished it
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 space-y-6 pb-8">
        {completedRewatches.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">{completedRewatches.length}</p>
                <p className="text-xs text-gray-500">Rewatches</p>
              </div>
              {avgDays !== null && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">{avgDays}d</p>
                  <p className="text-xs text-gray-500">Avg between rewatches</p>
                </div>
              )}
            </div>
          </div>
        )}

        {completedRewatches.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Rewatch History</h2>
            <div className="space-y-2">
              {completedRewatches.map((rewatch, i) => (
                <div key={rewatch.id} className="bg-gray-900 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">
                      Rewatch #{completedRewatches.length - i}
                    </p>
                    {rewatch.completed_at && (
                      <p className="text-xs text-gray-500">{formatMonthYear(rewatch.completed_at)}</p>
                    )}
                  </div>
                  {rewatch.started_at && rewatch.completed_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDuration(rewatch.started_at, rewatch.completed_at)}
                    </p>
                  )}
                  {rewatch.note && (
                    <p className="text-xs text-gray-400 mt-1 italic">"{rewatch.note}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-800">
          <button
            onClick={() => setShowRemoveConfirm(true)}
            className="w-full py-3 rounded-xl border border-red-900 text-red-400 text-sm font-medium active:scale-95 transition-transform"
          >
            Remove from Rotation
          </button>
        </div>
      </main>

      {showLogModal && activeRewatch && (
        <LogProgressModal
          show={show}
          rewatchId={activeRewatch.id}
          onClose={() => setShowLogModal(false)}
        />
      )}

      {showFinishedModal && activeRewatch && (
        <MarkFinishedModal
          showId={show.id}
          rewatchId={activeRewatch.id}
          onClose={() => setShowFinishedModal(false)}
        />
      )}

      {showRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowRemoveConfirm(false)} />
          <div className="relative bg-gray-900 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-white">Remove {show.title}?</h3>
            <p className="text-sm text-gray-400">All rewatch history will be permanently deleted.</p>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  await removeShow.mutateAsync(show.id)
                  navigate('/')
                }}
                className="w-full py-3 rounded-xl bg-red-700 text-white font-medium active:scale-95 transition-transform"
              >
                Remove
              </button>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="w-full py-3 rounded-xl bg-gray-800 text-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
