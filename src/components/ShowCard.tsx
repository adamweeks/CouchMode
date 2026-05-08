import { useState } from 'react'
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
import type { TMDBWatchProvider } from '../lib/tmdb'
import { providerLogoUrl } from '../lib/tmdb'
import { useCurrentProgress } from '../hooks/useProgressLogs'
import { useRewatches } from '../hooks/useRewatches'
import { useLogEpisodeSheet } from '../hooks/useLogEpisodeSheet'
import { LogProgressModal } from './LogProgressModal'

type Show = Database['public']['Tables']['shows']['Row']

type FilterTab = 'all' | 'watching' | 'done'

function StreamingProviders({ providers }: { providers: TMDBWatchProvider[] | null }) {
  if (!providers || providers.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px', flexWrap: 'wrap' }}>
      {providers.map(p => (
        <img
          key={p.provider_id}
          src={providerLogoUrl(p.logo_path)}
          alt={p.provider_name}
          title={p.provider_name}
          style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }}
        />
      ))}
    </div>
  )
}

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

  const { present: presentLogSheet } = useLogEpisodeSheet(
    show,
    activeRewatch?.id,
    currentProgress,
    activeRewatch ? () => setLogModalOpen(true) : undefined,
  )

  if (filter === 'watching' && !isWatching) return null
  if (filter === 'done' && !isDone) return null

  const totalEpisodes = show.episodes_per_season.reduce((sum, n) => sum + n, 0)
  const episodesWatched = currentProgress
    ? show.episodes_per_season.slice(0, currentProgress.season - 1).reduce((sum, n) => sum + n, 0) + currentProgress.episode
    : 0
  const progressPct = totalEpisodes > 0 ? Math.round((episodesWatched / totalEpisodes) * 100) : 0
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
        <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', marginBottom: '4px' }}>
          {episodeText}
        </p>
        <StreamingProviders providers={show.streaming_providers as TMDBWatchProvider[] | null} />
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
