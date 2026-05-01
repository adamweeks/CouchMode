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
  IonIcon,
} from '@ionic/react'
import { playOutline, checkmarkDoneOutline } from 'ionicons/icons'
import { useShow, useRemoveShow } from '../hooks/useShows'
import { useRewatches, useActiveRewatch } from '../hooks/useRewatches'
import { useCurrentProgress } from '../hooks/useProgressLogs'
import { useLogEpisodeSheet } from '../hooks/useLogEpisodeSheet'
import { MarkFinishedModal } from '../components/MarkFinishedModal'
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
  const [showFinishedModal, setShowFinishedModal] = useState(false)
  const [presentAlert] = useIonAlert()

  const { data: show, isLoading } = useShow(id!)
  const { data: rewatches = [] } = useRewatches(id!)
  const { data: activeRewatch } = useActiveRewatch(id!)
  const currentProgress = useCurrentProgress(activeRewatch?.id)
  const { present: presentLogSheet } = useLogEpisodeSheet(show ?? null, activeRewatch?.id, currentProgress)
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

      <IonContent>
        {/* Hero: poster + current position */}
        <div
          style={{
            background: 'var(--ion-item-background)',
            margin: '12px 16px',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            gap: '16px',
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}
        >
          <img
            src={show.poster_url ?? '/placeholder-poster.svg'}
            alt={show.title}
            style={{
              width: '88px',
              height: '132px',
              borderRadius: '10px',
              objectFit: 'cover',
              flexShrink: 0,
              background: 'var(--ion-color-light)',
            }}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>{show.title}</h2>
              <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', margin: '0 0 12px' }}>
                {show.total_seasons} season{show.total_seasons !== 1 ? 's' : ''}
                {completedRewatches.length > 0 && ` · ${completedRewatches.length} rewatch${completedRewatches.length !== 1 ? 'es' : ''}`}
              </p>
              {currentProgress ? (
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ion-color-primary)', margin: 0 }}>
                  {formatProgress(currentProgress.season, currentProgress.episode)}
                </p>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', margin: 0 }}>Not started</p>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              {activeRewatch && (
                <IonButton size="small" onClick={presentLogSheet}>
                  <IonIcon slot="start" icon={playOutline} />
                  Log Episode
                </IonButton>
              )}
              {activeRewatch && (
                <IonButton size="small" color="success" fill="outline" onClick={() => setShowFinishedModal(true)}>
                  <IonIcon slot="start" icon={checkmarkDoneOutline} />
                  Finished
                </IonButton>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        {completedRewatches.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: avgDays !== null ? '1fr 1fr' : '1fr',
              gap: '12px',
              margin: '0 16px 12px',
            }}
          >
            <div
              style={{
                background: 'var(--ion-item-background)',
                borderRadius: '14px',
                padding: '14px',
                textAlign: 'center',
                boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
              }}
            >
              <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ion-color-primary)', margin: 0 }}>
                {completedRewatches.length}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: '2px 0 0' }}>Rewatches</p>
            </div>
            {avgDays !== null && (
              <div
                style={{
                  background: 'var(--ion-item-background)',
                  borderRadius: '14px',
                  padding: '14px',
                  textAlign: 'center',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                }}
              >
                <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ion-color-primary)', margin: 0 }}>
                  {avgDays}d
                </p>
                <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: '2px 0 0' }}>Avg between rewatches</p>
              </div>
            )}
          </div>
        )}

        {/* Rewatch history */}
        {completedRewatches.length > 0 && (
          <>
            <p
              style={{
                padding: '0 20px 6px',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--ion-color-medium)',
              }}
            >
              Rewatch History
            </p>
            <IonList inset className="inset-shadow">
              {completedRewatches.map((rewatch, i) => (
                <IonItem key={rewatch.id}>
                  <IonLabel>
                    <h3 style={{ fontWeight: 600, fontSize: '14px' }}>
                      Rewatch #{completedRewatches.length - i}
                    </h3>
                    {rewatch.started_at && rewatch.completed_at && (
                      <p style={{ fontSize: '12px' }}>
                        {formatDuration(rewatch.started_at, rewatch.completed_at)}
                      </p>
                    )}
                    {rewatch.note && (
                      <p style={{ fontSize: '12px', fontStyle: 'italic' }}>"{rewatch.note}"</p>
                    )}
                  </IonLabel>
                  {rewatch.completed_at && (
                    <p
                      slot="end"
                      style={{ color: 'var(--ion-color-medium)', fontSize: '12px', margin: 0 }}
                    >
                      {formatMonthYear(rewatch.completed_at)}
                    </p>
                  )}
                </IonItem>
              ))}
            </IonList>
          </>
        )}

        {/* Remove show */}
        <div style={{ padding: '8px 16px 32px' }}>
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
