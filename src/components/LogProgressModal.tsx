import { useState } from 'react'
import ReactDOM from 'react-dom'
import { EpisodePicker } from './EpisodePicker'
import { useProgressLogs, useLogProgress } from '../hooks/useProgressLogs'
import { getCurrentProgress, isRegression } from '../lib/progressLogic'

interface LogProgressModalProps {
  show: {
    id: string
    title: string
    total_seasons: number
    episodes_per_season: number[]
  }
  rewatchId: string
  onClose: () => void
}

type ModalStep = 'picking' | 'regression_confirm' | 'submitting'

export function LogProgressModal({ show, rewatchId, onClose }: LogProgressModalProps) {
  const { data: logs = [] } = useProgressLogs(rewatchId)
  const currentProgress = getCurrentProgress(logs)

  const [step, setStep] = useState<ModalStep>('picking')
  const [value, setValue] = useState({
    season: currentProgress?.season ?? 1,
    episode: currentProgress?.episode ?? 1,
  })
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const logProgress = useLogProgress()

  async function handleSubmit() {
    setStep('submitting')
    setError(null)
    try {
      await logProgress.mutateAsync({
        rewatchId,
        showId: show.id,
        season: value.season,
        episode: value.episode,
        note: note || undefined,
        totalSeasons: show.total_seasons,
        episodesPerSeason: show.episodes_per_season,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('picking')
    }
  }

  function handlePickerSubmit() {
    if (isRegression(value.season, value.episode, currentProgress)) {
      setStep('regression_confirm')
      return
    }
    handleSubmit()
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">{show.title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400"
          >
            ✕
          </button>
        </div>

        {step === 'regression_confirm' ? (
          <div className="p-6 space-y-4">
            <p className="text-center text-gray-300">
              This is earlier than your current progress ({currentProgress ? `S${currentProgress.season} E${currentProgress.episode}` : ''}). What's happening?
            </p>
            <div className="space-y-3">
              <button
                onClick={async () => {
                  await logProgress.mutateAsync({
                    rewatchId,
                    showId: show.id,
                    season: value.season,
                    episode: value.episode,
                    note: note || undefined,
                    totalSeasons: show.total_seasons,
                    episodesPerSeason: show.episodes_per_season,
                    onSeriesComplete: () => {},
                  })
                  onClose()
                }}
                className="w-full py-3 rounded-xl bg-purple-600 text-white font-medium active:scale-95 transition-transform"
              >
                I started over
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gray-800 text-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-400 text-center">Log where you are right now</p>

            <EpisodePicker
              totalSeasons={show.total_seasons}
              episodesPerSeason={show.episodes_per_season}
              value={value}
              onChange={setValue}
            />

            <div className="space-y-1">
              <label className="text-sm text-gray-400">Note (optional)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. started during holiday break"
                rows={2}
                className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <button
              onClick={handlePickerSubmit}
              disabled={step === 'submitting'}
              className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-50 active:scale-95 transition-transform"
            >
              {step === 'submitting' ? 'Saving…' : `Log S${value.season} E${value.episode}`}
            </button>
          </div>
        )}

        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}
