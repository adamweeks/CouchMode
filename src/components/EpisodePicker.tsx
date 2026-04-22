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
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-10 h-10 rounded-full bg-gray-700 text-white text-lg font-bold disabled:opacity-30 flex items-center justify-center active:scale-95 transition-transform"
        >
          −
        </button>
        <span className="w-10 text-center text-xl font-semibold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-10 h-10 rounded-full bg-gray-700 text-white text-lg font-bold disabled:opacity-30 flex items-center justify-center active:scale-95 transition-transform"
        >
          +
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
