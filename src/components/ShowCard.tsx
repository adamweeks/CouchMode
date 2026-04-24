import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IonCard,
  IonCardContent,
  IonProgressBar,
  IonChip,
  IonIcon,
  IonLabel,
  IonButton,
} from '@ionic/react'
import { reloadOutline, playOutline } from 'ionicons/icons'
import { formatMonthYear } from '../lib/progressLogic'
import type { Database } from '../lib/database.types'
import { useCurrentProgress } from '../hooks/useProgressLogs'
import { useRewatches } from '../hooks/useRewatches'
import { LogProgressModal } from './LogProgressModal'

type Show = Database['public']['Tables']['shows']['Row']

type FilterTab = 'all' | 'watching' | 'done'

export function ShowCard({ show, filter = 'all' }: { show: Show; filter?: FilterTab }) {
  const navigate = useNavigate()
  const [showLogModal, setShowLogModal] = useState(false)

  const { data: rewatches = [] } = useRewatches(show.id)
  const activeRewatch = rewatches.find(r => r.status === 'in_progress') ?? null
  const completedRewatches = rewatches.filter(r => r.status === 'completed')
  const currentProgress = useCurrentProgress(activeRewatch?.id)

  const isWatching = !!currentProgress
  const isDone = !currentProgress && completedRewatches.length > 0

  if (filter === 'watching' && !isWatching) return null
  if (filter === 'done' && !isDone) return null

  const maxEpisodesInSeason = currentProgress
    ? (show.episodes_per_season[currentProgress.season - 1] ?? 1)
    : 1
  const progressValue = currentProgress
    ? currentProgress.episode / maxEpisodesInSeason
    : 0
  const rewatchNumber = completedRewatches.length + 1

  return (
    <>
      <IonCard style={{ margin: '0 16px 12px' }}>
        <IonCardContent style={{ padding: '14px 16px' }}>
          {/* Poster + info row */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <img
              src={show.poster_url ?? '/placeholder-poster.svg'}
              alt={show.title}
              loading="lazy"
              style={{
                width: '72px',
                height: '96px',
                borderRadius: '8px',
                objectFit: 'cover',
                flexShrink: 0,
                background: 'var(--ion-color-light)',
              }}
            />
            <div style={{ flex: 1, minWidth: 0, paddingTop: '2px' }}>
              <h2
                style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  lineHeight: 1.25,
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {show.title}
              </h2>
              {currentProgress ? (
                <p
                  style={{
                    color: 'var(--ion-color-medium)',
                    fontSize: '0.875rem',
                    marginBottom: '8px',
                  }}
                >
                  Season {currentProgress.season} · Episode {currentProgress.episode}
                </p>
              ) : (
                <p
                  style={{
                    color: 'var(--ion-color-medium)',
                    fontSize: '0.875rem',
                    marginBottom: '8px',
                  }}
                >
                  {isDone
                    ? `Last watched ${formatMonthYear(completedRewatches[0].completed_at!)}`
                    : 'Not started yet'}
                </p>
              )}
              <IonChip
                outline
                color="primary"
                style={{ height: '26px', fontSize: '0.75rem', margin: 0, padding: '0 8px' }}
              >
                <IonIcon icon={reloadOutline} style={{ fontSize: '14px', marginRight: '4px' }} />
                <IonLabel>Rewatch #{rewatchNumber}</IonLabel>
              </IonChip>
            </div>
          </div>

          {/* Season progress bar */}
          {currentProgress && (
            <div style={{ marginTop: '14px' }}>
              <IonProgressBar value={progressValue} color="primary" />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '5px',
                  fontSize: '0.75rem',
                }}
              >
                <span style={{ color: 'var(--ion-color-primary)' }}>
                  {Math.round(progressValue * 100)}% through season
                </span>
                <span style={{ color: 'var(--ion-color-medium)' }}>
                  E{currentProgress.episode} of {maxEpisodesInSeason}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
            <IonButton
              fill="solid"
              style={{ flex: 1 }}
              disabled={!activeRewatch}
              onClick={() => setShowLogModal(true)}
            >
              <IonIcon slot="start" icon={playOutline} />
              Log Episode
            </IonButton>
            <IonButton
              fill="outline"
              style={{ flex: 1 }}
              onClick={() => navigate(`/shows/${show.id}`)}
            >
              Details
            </IonButton>
          </div>
        </IonCardContent>

        {showLogModal && activeRewatch && (
          <LogProgressModal
            show={show}
            rewatchId={activeRewatch.id}
            onClose={() => setShowLogModal(false)}
          />
        )}
      </IonCard>
    </>
  )
}
