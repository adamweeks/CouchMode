interface EpisodePickerProps {
  totalSeasons: number
  episodesPerSeason: number[]
  value: { season: number; episode: number }
  onChange: (val: { season: number; episode: number }) => void
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

export function EpisodePicker({ totalSeasons, episodesPerSeason, value, onChange }: EpisodePickerProps) {
  const maxEpisodes = episodesPerSeason[value.season - 1] ?? 1

  function handleSeasonChange(newSeason: number) {
    const newMax = episodesPerSeason[newSeason - 1] ?? 1
    onChange({ season: newSeason, episode: Math.min(value.episode, newMax) })
  }

  function handleEpisodeChange(newEpisode: number) {
    onChange({ season: value.season, episode: newEpisode })
  }

  return (
    <div className="flex items-center justify-center gap-8 py-4">
      <Stepper label="Season" value={value.season} min={1} max={totalSeasons} onChange={handleSeasonChange} />
      <Stepper label="Episode" value={value.episode} min={1} max={maxEpisodes} onChange={handleEpisodeChange} />
    </div>
  )
}
