import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatProgress, countWatchedEpisodes, formatMonthYear, isCaughtUp, formatAirStatus } from '../lib/progressLogic'
import type { AirStatus } from '../lib/progressLogic'
import {
  IonItem,
  IonLabel,
  IonThumbnail,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonIcon,
  IonReorder,
} from '@ionic/react'
import {
  playOutline,
  playSkipForwardOutline,
  eyeOutline,
  checkmarkCircleOutline,
  checkmarkSharp,
  ellipseOutline,
} from 'ionicons/icons'
import type { Database } from '../lib/database.types'
import { useCurrentProgress } from '../hooks/useProgressLogs'
import { useRewatches } from '../hooks/useRewatches'
import { useLogEpisodeSheet } from '../hooks/useLogEpisodeSheet'
import { LogProgressModal } from './LogProgressModal'
import { StatusLine } from './StatusLine'
import { useTMDBSeason } from '../hooks/useTMDBSeason'

type Show = Database['public']['Tables']['shows']['Row']

type FilterTab = 'all' | 'watching' | 'done'

export function ShowCard({
  show,
  filter = 'all',
  reorderMode = false,
  showStatusLabel = true,
}: {
  show: Show
  filter?: FilterTab
  reorderMode?: boolean
  /**
   * Whether to show the status word (e.g. "Watched", "Completed"). Set false
   * when the card sits under a section header that already names the status,
   * to avoid repeating it. The status icon is always shown.
   */
  showStatusLabel?: boolean
}) {
  const navigate = useNavigate()
  const [logModalOpen, setLogModalOpen] = useState(false)

  const { data: rewatches = [] } = useRewatches(show.id)
  const activeRewatch = rewatches.find(r => r.status === 'in_progress') ?? null
  const completedRewatches = rewatches.filter(r => r.status === 'completed')
  const currentProgress = useCurrentProgress(activeRewatch?.id)

  const isWatching = !!currentProgress
  const isDone = !currentProgress && completedRewatches.length > 0

  const { data: seasonData } = useTMDBSeason(
    currentProgress ? show.tmdb_id : null,
    currentProgress?.season ?? 0,
  )
  const episodeTitle = seasonData?.episodes.find(
    ep => ep.episode_number === currentProgress?.episode,
  )?.name

  const { present: presentLogSheet, logNext, nextEp, isLogging } = useLogEpisodeSheet(
    show,
    activeRewatch?.id,
    currentProgress,
    activeRewatch ? () => setLogModalOpen(true) : undefined,
  )

  // The episode coming up next — shown under the last-watched line so the row
  // answers both "where was I?" and "what's next?".
  const { data: nextSeasonData } = useTMDBSeason(
    currentProgress && nextEp ? show.tmdb_id : null,
    nextEp?.season ?? 0,
  )
  const nextEpisodeTitle = nextSeasonData?.episodes.find(
    ep => ep.episode_number === nextEp?.episode,
  )?.name

  if (filter === 'watching' && !isWatching) return null
  if (filter === 'done' && !isDone) return null

  const totalEpisodes = show.episodes_per_season.reduce((sum, n) => sum + n, 0)
  const episodesWatched = currentProgress ? countWatchedEpisodes(show.episodes_per_season, currentProgress) : 0
  const progressPct = totalEpisodes > 0 ? Math.round((episodesWatched / totalEpisodes) * 100) : 0

  const airStatus = (show.air_status as AirStatus | null) ?? null
  const caughtUp = isCaughtUp(currentProgress, airStatus)
  const airLine = caughtUp ? formatAirStatus(airStatus) : null
  // A caught-up show's air-status line already names the next episode (and the
  // one in episodes_per_season may not have aired yet), so skip it there — and
  // skip the quick-log button too, so it can't log an unaired episode.
  const showUpNext = isWatching && !caughtUp && !!nextEp
  const nextEpLabel = nextEp
    ? formatProgress(nextEp.season, nextEp.episode) + (nextEpisodeTitle ? ` "${nextEpisodeTitle}"` : '')
    : ''

  const lastCompletedAt = completedRewatches.reduce<string | null>((latest, r) => {
    if (!r.completed_at) return latest
    return !latest || r.completed_at > latest ? r.completed_at : latest
  }, null)

  const status = currentProgress
    ? {
        icon: eyeOutline,
        label: 'Watched',
        detail:
          formatProgress(currentProgress.season, currentProgress.episode) +
          (episodeTitle ? ` · ${episodeTitle}` : ''),
      }
    : isDone
    ? {
        icon: checkmarkCircleOutline,
        label: 'Completed',
        detail: lastCompletedAt ? formatMonthYear(lastCompletedAt) : undefined,
      }
    : { icon: ellipseOutline, label: 'Not started', detail: undefined }

  const item = (
    <IonItem
      button={!reorderMode}
      detail={!reorderMode}
      onClick={reorderMode ? undefined : () => navigate(`/tmdb/${show.tmdb_id}`)}
    >
      <IonThumbnail
        slot="start"
        style={
          {
            '--size': '52px',
            '--border-radius': '6px',
            height: '94px',
            paddingTop: '8px',
            paddingBottom: '8px',
            marginRight: '12px',
          } as React.CSSProperties
        }
      >
        <img
          src={show.poster_url ?? '/placeholder-poster.svg'}
          alt={show.title}
          loading="lazy"
          style={{ objectFit: 'cover', height: '100%', width: '100%', borderRadius: '6px' }}
        />
      </IonThumbnail>

      <IonLabel style={{ margin: '10px 0' }}>
        <h2 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{show.title}</h2>
        <StatusLine
          icon={status.icon}
          label={status.label}
          detail={status.detail}
          hideLabel={!showStatusLabel}
          style={{ marginBottom: showUpNext ? '3px' : '8px' }}
        />
        {showUpNext && nextEp && (
          <StatusLine
            icon={playSkipForwardOutline}
            label="Up next"
            detail={
              formatProgress(nextEp.season, nextEp.episode) +
              (nextEpisodeTitle ? ` · ${nextEpisodeTitle}` : '')
            }
            hideLabel={!showStatusLabel}
            // Same blue as the quick-log button, so the eye links the two.
            color="var(--ion-color-primary)"
            style={{ marginBottom: '8px', fontWeight: 500 }}
          />
        )}
        {currentProgress && (
          <>
            <div
              style={{
                height: '3px',
                background: 'var(--ion-color-light)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '4px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: 'var(--ion-color-primary)',
                  borderRadius: '2px',
                }}
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--ion-color-primary)', fontWeight: 600 }}>
              {caughtUp && airLine ? airLine : `${progressPct}% through show`}
            </p>
          </>
        )}
      </IonLabel>

      {!reorderMode && (
        <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '4px' }}>
          {showUpNext && logNext && (
            <button
              aria-label={`Mark ${show.title} ${nextEpLabel} as watched`}
              disabled={isLogging}
              onClick={e => {
                e.stopPropagation()
                logNext()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: 'none',
                background: 'var(--ion-color-primary)',
                color: 'var(--ion-color-primary-contrast, #fff)',
                fontSize: '13px',
                fontWeight: 700,
                flexShrink: 0,
                cursor: 'pointer',
                opacity: isLogging ? 0.5 : 1,
              }}
            >
              <IonIcon icon={checkmarkSharp} aria-hidden="true" style={{ fontSize: '18px' }} />
            </button>
          )}
        </div>
      )}

      {reorderMode && <IonReorder slot="end" />}
    </IonItem>
  )

  if (reorderMode) {
    return item
  }

  return (
    <>
      <IonItemSliding>
        {item}
        <IonItemOptions side="end" onIonSwipe={presentLogSheet}>
          <IonItemOption color="primary" expandable onClick={presentLogSheet}>
            <div
              slot="icon-only"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <IonIcon icon={playOutline} style={{ fontSize: '18px' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>LOG</span>
            </div>
          </IonItemOption>
        </IonItemOptions>
      </IonItemSliding>

      {logModalOpen && activeRewatch && (
        <LogProgressModal
          show={show}
          rewatchId={activeRewatch.id}
          onClose={() => setLogModalOpen(false)}
        />
      )}
    </>
  )
}
