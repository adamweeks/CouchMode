import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatProgress, countWatchedEpisodes, formatMonthYear } from '../lib/progressLogic'
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
  reloadOutline,
  eyeOutline,
  checkmarkCircleOutline,
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
}: {
  show: Show
  filter?: FilterTab
  reorderMode?: boolean
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

  const { present: presentLogSheet, logNext, isLogging } = useLogEpisodeSheet(
    show,
    activeRewatch?.id,
    currentProgress,
    activeRewatch ? () => setLogModalOpen(true) : undefined,
  )

  if (filter === 'watching' && !isWatching) return null
  if (filter === 'done' && !isDone) return null

  const totalEpisodes = show.episodes_per_season.reduce((sum, n) => sum + n, 0)
  const episodesWatched = currentProgress ? countWatchedEpisodes(show.episodes_per_season, currentProgress) : 0
  const progressPct = totalEpisodes > 0 ? Math.round((episodesWatched / totalEpisodes) * 100) : 0
  const rewatchNumber = completedRewatches.length + 1

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
            '--size': '44px',
            '--border-radius': '6px',
            height: '58px',
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

      <IonLabel>
        <h2 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '2px' }}>{show.title}</h2>
        <StatusLine
          icon={status.icon}
          label={status.label}
          detail={status.detail}
          style={{ marginBottom: '6px' }}
        />
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
              {progressPct}% through show
            </p>
          </>
        )}
      </IonLabel>

      {!reorderMode && (
        <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingRight: '4px' }}>
          {isWatching && logNext && (
            <button
              aria-label={`Log next episode of ${show.title}`}
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
              +1
            </button>
          )}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              background: 'rgba(var(--ion-color-primary-rgb), 0.12)',
              color: 'var(--ion-color-primary)',
              borderRadius: '20px',
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <IonIcon icon={reloadOutline} style={{ fontSize: '11px' }} />
            #{rewatchNumber}
          </span>
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
