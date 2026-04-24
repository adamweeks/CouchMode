import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  useIonAlert,
} from '@ionic/react'
import { useShow } from '../hooks/useShows'
import { useRewatches, useActiveRewatch } from '../hooks/useRewatches'
import { useCurrentProgress } from '../hooks/useProgressLogs'
import { useRemoveShow } from '../hooks/useShows'
import { LogProgressModal } from '../components/LogProgressModal'
import { MarkFinishedModal } from '../components/MarkFinishedModal'
import { StatusBadge } from '../components/StatusBadge'
import { formatProgress, formatDuration, formatMonthYear } from '../lib/progressLogic'

type Rewatch = { id: string; completed_at: string | null; started_at: string; note: string | null; status: string }

function avgDaysBetweenRewatches(rewatches: Rewatch[]): number | null {
  if (rewatches.length < 2) return null
  const dates = rewatches
    .map(r => new Date(r.completed_at!).getTime())
    .sort((a, b) => a - b)
  let total = 0
  for (let i = 1; i < dates.length; i++) total += dates[i] - dates[i - 1]
  return Math.round(total / (dates.length - 1) / (1000 * 60 * 60 * 24))
}

export function ShowDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showLogModal, setShowLogModal] = useState(false)
  const [showFinishedModal, setShowFinishedModal] = useState(false)
  const [presentAlert] = useIonAlert()

  const { data: show, isLoading } = useShow(id!)
  const { data: rewatches = [] } = useRewatches(id!)
  const { data: activeRewatch } = useActiveRewatch(id!)
  const currentProgress = useCurrentProgress(activeRewatch?.id)
  const removeShow = useRemoveShow()

  if (isLoading) {
    return (
      <IonPage>
        <IonContent>
          <div className="flex justify-center pt-16" role="status" aria-label="Loading show details">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    )
  }

  if (!show) {
    return (
      <IonPage>
        <IonContent>
          <p className="p-4" style={{ color: 'var(--ion-color-medium)' }}>Show not found</p>
        </IonContent>
      </IonPage>
    )
  }

  const completedRewatches = rewatches.filter(r => r.status === 'completed')
  const status = currentProgress ? 'in_progress' : 'not_started'
  const avgDays = avgDaysBetweenRewatches(completedRewatches)

  function handleRemove() {
    presentAlert({
      header: `Remove ${show!.title}?`,
      message: 'All rewatch history will be permanently deleted.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: async () => {
            await removeShow.mutateAsync(show!.id)
            navigate('/')
          },
        },
      ],
    })
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>{show.title}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {/* Poster + current progress */}
        <div className="flex gap-4 px-4 pt-4 pb-4">
          <img
            src={show.poster_url ?? '/placeholder-poster.svg'}
            alt={show.title}
            style={{
              width: '96px',
              height: '144px',
              borderRadius: '12px',
              objectFit: 'cover',
              flexShrink: 0,
              background: 'var(--ion-color-light)',
            }}
          />
          <div className="flex flex-col justify-between py-1 flex-1">
            <div className="space-y-2">
              <StatusBadge status={status} />
              {currentProgress ? (
                <p className="text-2xl font-bold">
                  {formatProgress(currentProgress.season, currentProgress.episode)}
                </p>
              ) : (
                <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.875rem' }}>Not started yet</p>
              )}
              <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.75rem' }}>
                {show.total_seasons} season{show.total_seasons !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <IonButton size="small" onClick={() => setShowLogModal(true)}>
                Log Progress
              </IonButton>
              <IonButton size="small" color="success" onClick={() => setShowFinishedModal(true)}>
                Finished it
              </IonButton>
            </div>
          </div>
        </div>

        {/* Stats */}
        {completedRewatches.length > 0 && (
          <div
            className="mx-4 mb-4 rounded-2xl p-4"
            style={{ background: 'var(--ion-item-background)' }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold" style={{ color: 'var(--ion-color-primary)' }}>
                  {completedRewatches.length}
                </p>
                <p className="text-xs" style={{ color: 'var(--ion-color-medium)' }}>Rewatches</p>
              </div>
              {avgDays !== null && (
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: 'var(--ion-color-primary)' }}>
                    {avgDays}d
                  </p>
                  <p className="text-xs" style={{ color: 'var(--ion-color-medium)' }}>Avg between rewatches</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rewatch history */}
        {completedRewatches.length > 0 && (
          <>
            <p
              className="px-4 mb-2 text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--ion-color-medium)' }}
            >
              Rewatch History
            </p>
            <IonList lines="none" className="px-4" style={{ background: 'transparent' }}>
              {completedRewatches.map((rewatch, i) => (
                <IonItem
                  key={rewatch.id}
                  lines="none"
                  style={
                    {
                      '--border-radius': '16px',
                      marginBottom: '8px',
                    } as React.CSSProperties
                  }
                >
                  <IonLabel>
                    <h3 style={{ fontWeight: 500 }}>
                      Rewatch #{completedRewatches.length - i}
                    </h3>
                    {rewatch.started_at && rewatch.completed_at && (
                      <p>{formatDuration(rewatch.started_at, rewatch.completed_at)}</p>
                    )}
                    {rewatch.note && (
                      <p style={{ fontStyle: 'italic' }}>"{rewatch.note}"</p>
                    )}
                  </IonLabel>
                  {rewatch.completed_at && (
                    <p
                      slot="end"
                      style={{ color: 'var(--ion-color-medium)', fontSize: '0.75rem' }}
                    >
                      {formatMonthYear(rewatch.completed_at)}
                    </p>
                  )}
                </IonItem>
              ))}
            </IonList>
          </>
        )}

        {/* Remove */}
        <div className="px-4 pt-6 pb-8">
          <IonButton
            expand="block"
            fill="outline"
            color="danger"
            onClick={handleRemove}
          >
            Remove from Rotation
          </IonButton>
        </div>
      </IonContent>

      {showLogModal && activeRewatch && (
        <LogProgressModal
          show={show}
          rewatchId={activeRewatch.id}
          onClose={() => setShowLogModal(false)}
        />
      )}

      {showFinishedModal && activeRewatch && (
        <MarkFinishedModal
          showId={show.id}
          rewatchId={activeRewatch.id}
          rewatchStartedAt={activeRewatch.started_at}
          onClose={() => setShowFinishedModal(false)}
        />
      )}
    </IonPage>
  )
}
