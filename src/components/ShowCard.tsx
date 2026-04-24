import {
  IonItem,
  IonLabel,
  IonThumbnail,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonIcon,
  useIonAlert,
} from '@ionic/react'
import { trash } from 'ionicons/icons'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'
import { formatProgress, formatMonthYear } from '../lib/progressLogic'
import type { Database } from '../lib/database.types'
import { useCurrentProgress } from '../hooks/useProgressLogs'
import { useRewatches } from '../hooks/useRewatches'
import { useRemoveShow } from '../hooks/useShows'

type Show = Database['public']['Tables']['shows']['Row']

export function ShowCard({ show }: { show: Show }) {
  const navigate = useNavigate()
  const { data: rewatches = [] } = useRewatches(show.id)
  const activeRewatch = rewatches.find(r => r.status === 'in_progress') ?? null
  const completedRewatches = rewatches.filter(r => r.status === 'completed')
  const currentProgress = useCurrentProgress(activeRewatch?.id)
  const removeShow = useRemoveShow()
  const [presentAlert] = useIonAlert()

  const status = currentProgress ? 'in_progress' : 'not_started'
  const lastCompleted = completedRewatches[0]

  function handleRemove() {
    presentAlert({
      header: `Remove ${show.title}?`,
      message: 'All rewatch history will be permanently deleted.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: async () => {
            await removeShow.mutateAsync(show.id)
            navigate('/')
          },
        },
      ],
    })
  }

  return (
    <IonItemSliding>
      <IonItem
        button
        detail={false}
        lines="none"
        onClick={() => navigate(`/shows/${show.id}`)}
        style={{ '--border-radius': '16px', marginBottom: '12px' } as React.CSSProperties}
      >
        <IonThumbnail
          slot="start"
          style={
            {
              '--size': '64px',
              '--border-radius': '8px',
              height: '96px',
              paddingTop: '8px',
              paddingBottom: '8px',
            } as React.CSSProperties
          }
        >
          <img
            src={show.poster_url ?? '/placeholder-poster.svg'}
            alt={show.title}
            style={{ objectFit: 'cover', height: '100%', width: '100%', borderRadius: '8px' }}
            loading="lazy"
          />
        </IonThumbnail>

        <IonLabel>
          <h2 style={{ fontWeight: 600 }}>{show.title}</h2>
          <p>
            <StatusBadge status={status} />
          </p>
          {currentProgress && (
            <p style={{ color: 'var(--ion-color-primary)', fontWeight: 500 }}>
              {formatProgress(currentProgress.season, currentProgress.episode)}
            </p>
          )}
          {lastCompleted?.completed_at && (
            <p>Finished {formatMonthYear(lastCompleted.completed_at)}</p>
          )}
          {completedRewatches.length > 0 && (
            <p>
              {completedRewatches.length} rewatch
              {completedRewatches.length !== 1 ? 'es' : ''}
            </p>
          )}
        </IonLabel>
      </IonItem>

      <IonItemOptions side="end" onIonSwipe={handleRemove}>
        <IonItemOption color="danger" expandable onClick={handleRemove}>
          <IonIcon slot="icon-only" icon={trash} />
        </IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  )
}
