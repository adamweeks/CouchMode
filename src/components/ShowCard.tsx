import { useNavigate } from 'react-router-dom'
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
import { playOutline, reloadOutline } from 'ionicons/icons'
import type { Database } from '../lib/database.types'
import { useCurrentProgress } from '../hooks/useProgressLogs'
import { useRewatches } from '../hooks/useRewatches'
import { useLogEpisodeSheet } from '../hooks/useLogEpisodeSheet'

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

  const { data: rewatches = [] } = useRewatches(show.id)
  const activeRewatch = rewatches.find(r => r.status === 'in_progress') ?? null
  const completedRewatches = rewatches.filter(r => r.status === 'completed')
  const currentProgress = useCurrentProgress(activeRewatch?.id)

  const isWatching = !!currentProgress
  const isDone = !currentProgress && completedRewatches.length > 0

  const { present: presentLogSheet } = useLogEpisodeSheet(show, activeRewatch?.id, currentProgress)

  if (filter === 'watching' && !isWatching) return null
  if (filter === 'done' && !isDone) return null

  const maxEpisodesInSeason = currentProgress
    ? (show.episodes_per_season[currentProgress.season - 1] ?? 1)
    : 1
  const progressValue = currentProgress
    ? currentProgress.episode / maxEpisodesInSeason
    : 0
  const progressPct = Math.round(progressValue * 100)
  const rewatchNumber = completedRewatches.length + 1

  const episodeText = currentProgress
    ? `S${currentProgress.season} E${currentProgress.episode}`
    : isDone
    ? 'Completed'
    : 'Not started'

  const item = (
    <IonItem
      button={!reorderMode}
      detail={!reorderMode}
      onClick={reorderMode ? undefined : () => navigate(`/shows/${show.id}`)}
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
        <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', marginBottom: '6px' }}>
          {episodeText}
        </p>
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
              {progressPct}% through season
            </p>
          </>
        )}
      </IonLabel>

      {!reorderMode && (
        <div slot="end" style={{ display: 'flex', alignItems: 'center', paddingRight: '4px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              background: '#ebf3ff',
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
  )
}
