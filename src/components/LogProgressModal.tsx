import { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { EpisodePicker } from './EpisodePicker'
import { useProgressLogs, useLogProgress } from '../hooks/useProgressLogs'
import { getCurrentProgress, isRegression, formatProgress, getErrorMessage } from '../lib/progressLogic'

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

function CloseIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

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
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function submitLog() {
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
      setError(getErrorMessage(e))
      setStep('picking')
    }
  }

  function handlePickerSubmit() {
    if (isRegression(value.season, value.episode, currentProgress)) {
      setStep('regression_confirm')
      return
    }
    submitLog()
  }

  const modal = (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-modal-title"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-gray-900 rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 id="log-modal-title" className="text-lg font-semibold">{show.title}</h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-gray-700 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            <CloseIcon />
          </button>
        </div>

        {step === 'regression_confirm' ? (
          <div className="p-6 space-y-4">
            <p className="text-center text-gray-300">
              This is earlier than your current progress
              {currentProgress ? ` (${formatProgress(currentProgress.season, currentProgress.episode)})` : ''}.
              What's happening?
            </p>
            <div className="space-y-3">
              <button
                onClick={submitLog}
                className="w-full py-3 rounded-xl bg-purple-600 text-white font-medium active:scale-95 transition-transform min-h-[44px] hover:bg-purple-700 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                I started over
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gray-800 text-gray-300 font-medium min-h-[44px] hover:bg-gray-700 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
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
              <label htmlFor="progress-note" className="text-sm text-gray-400">Note (optional)</label>
              <textarea
                id="progress-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. started during holiday break"
                rows={2}
                className="w-full bg-gray-800 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {error && <p role="alert" className="text-sm text-red-300 text-center">{error}</p>}

            <button
              onClick={handlePickerSubmit}
              disabled={step === 'submitting'}
              className="w-full py-3 rounded-xl bg-purple-600 text-white font-semibold disabled:opacity-60 active:scale-95 transition-transform min-h-[44px] hover:bg-purple-700 focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              {step === 'submitting' ? 'Saving…' : `Log ${formatProgress(value.season, value.episode)}`}
            </button>
          </div>
        )}

        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  )

  return ReactDOM.createPortal(modal, document.body)
}
