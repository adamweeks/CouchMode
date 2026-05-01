import { posterUrl } from '../lib/tmdb'

interface EpisodePickerProps {
  totalSeasons: number
  episodesPerSeason: number[]
  value: { season: number; episode: number }
  onChange: (val: { season: number; episode: number }) => void
  episodeName?: string
  episodeStillPath?: string | null
  isLoadingEpisode?: boolean
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span id={`stepper-label-${label.toLowerCase()}`} className="text-xs text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <div className="flex items-center gap-3" role="group" aria-labelledby={`stepper-label-${label.toLowerCase()}`}>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="w-11 h-11 rounded-full bg-gray-700 text-white text-lg font-bold disabled:opacity-30 flex items-center justify-center active:scale-95 transition-transform hover:bg-gray-600 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          <span aria-hidden="true">−</span>
        </button>
        <span
          className="w-10 text-center text-xl font-semibold tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="w-11 h-11 rounded-full bg-gray-700 text-white text-lg font-bold disabled:opacity-30 flex items-center justify-center active:scale-95 transition-transform hover:bg-gray-600 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  )
}

export function EpisodePicker({
  totalSeasons,
  episodesPerSeason,
  value,
  onChange,
  episodeName,
  episodeStillPath,
  isLoadingEpisode,
}: EpisodePickerProps) {
  const maxEpisodes = episodesPerSeason[value.season - 1] ?? 1

  function handleSeasonChange(newSeason: number) {
    const newMax = episodesPerSeason[newSeason - 1] ?? 1
    onChange({ season: newSeason, episode: Math.min(value.episode, newMax) })
  }

  function handleEpisodeChange(newEpisode: number) {
    onChange({ season: value.season, episode: newEpisode })
  }

  const stillUrl = episodeStillPath ? posterUrl(episodeStillPath) : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center gap-8 py-4">
        <Stepper label="Season" value={value.season} min={1} max={totalSeasons} onChange={handleSeasonChange} />
        <Stepper label="Episode" value={value.episode} min={1} max={maxEpisodes} onChange={handleEpisodeChange} />
      </div>

      {/* Episode preview */}
      <div
        style={{
          minHeight: '64px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 12px',
          background: 'var(--ion-item-background)',
          borderRadius: '12px',
        }}
      >
        {isLoadingEpisode ? (
          <div
            style={{
              width: '114px',
              height: '64px',
              borderRadius: '8px',
              background: 'var(--ion-color-light)',
              flexShrink: 0,
            }}
          />
        ) : stillUrl ? (
          <img
            src={stillUrl}
            alt=""
            aria-hidden="true"
            style={{
              width: '114px',
              height: '64px',
              borderRadius: '8px',
              objectFit: 'cover',
              flexShrink: 0,
              background: 'var(--ion-color-light)',
            }}
          />
        ) : (
          <div
            style={{
              width: '114px',
              height: '64px',
              borderRadius: '8px',
              background: 'var(--ion-color-light)',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '24px', opacity: 0.3 }}>📺</span>
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {isLoadingEpisode ? (
            <div
              style={{
                height: '14px',
                borderRadius: '6px',
                background: 'var(--ion-color-light)',
                width: '70%',
              }}
            />
          ) : episodeName ? (
            <p
              style={{
                fontSize: '13px',
                fontWeight: 600,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {episodeName}
            </p>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: 0 }}>
              No episode info available
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
