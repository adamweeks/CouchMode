import { useState } from 'react'
import { useMarkSeriesFinished } from '../hooks/useRewatches'
import { getErrorMessage } from '../lib/progressLogic'

interface Props {
  showId: string
  rewatchId: string
  onClose: () => void
}

export function MarkFinishedModal({ showId, rewatchId, onClose }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState(today)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const markFinished = useMarkSeriesFinished()

  async function handleSubmit() {
    setError(null)
    if (startDate && endDate && startDate > endDate) {
      setError('Start date must be before finish date')
      return
    }
    try {
      const completedAt = new Date(endDate + 'T12:00:00Z').toISOString()
      const startedAt = startDate ? new Date(startDate + 'T12:00:00Z').toISOString() : undefined
      await markFinished.mutateAsync({ rewatchId, showId, startedAt, completedAt, note: note || undefined })
      onClose()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-t-2xl w-full max-w-lg p-6 space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <h3 className="text-lg font-semibold text-white">Finished it!</h3>

        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-medium">
            When did you start? <span className="text-gray-600">(optional)</span>
          </label>
          <input
            type="date"
            value={startDate}
            max={endDate || today}
            onChange={e => setStartDate(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-medium">When did you finish?</label>
          <input
            type="date"
            value={endDate}
            max={today}
            onChange={e => setEndDate(e.target.value)}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-400 font-medium">
            Note <span className="text-gray-600">(optional)</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Any thoughts on this rewatch?"
            rows={2}
            className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-600"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="space-y-2">
          <button
            onClick={handleSubmit}
            disabled={markFinished.isPending || !endDate}
            className="w-full py-3 rounded-xl bg-green-700 text-white font-medium active:scale-95 transition-transform disabled:opacity-50"
          >
            {markFinished.isPending ? 'Saving...' : 'Mark as Finished'}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-800 text-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
