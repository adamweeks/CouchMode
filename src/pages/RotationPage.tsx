import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonButton,
} from '@ionic/react'
import { add } from 'ionicons/icons'
import { useNavigate } from 'react-router-dom'
import { useShows } from '../hooks/useShows'
import { ShowCard } from '../components/ShowCard'

function TvIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="7" width="20" height="15" rx="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  )
}

export function RotationPage() {
  const navigate = useNavigate()
  const { data: shows = [], isLoading } = useShows()

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Rotation</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {isLoading ? (
          <div
            className="flex justify-center pt-16"
            role="status"
            aria-label="Loading shows"
          >
            <IonSpinner name="crescent" />
          </div>
        ) : shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center px-8 gap-4">
            <TvIcon className="w-16 h-16" style={{ color: 'var(--ion-color-medium)' }} />
            <h2 className="text-xl font-semibold">No shows yet</h2>
            <p className="text-sm max-w-xs" style={{ color: 'var(--ion-color-medium)' }}>
              Add the shows you rewatch regularly to start tracking your progress.
            </p>
            <IonButton onClick={() => navigate('/search')} style={{ marginTop: '0.5rem' }}>
              Add Your First Show
            </IonButton>
          </div>
        ) : (
          <IonList lines="none" className="px-4 pt-2 pb-24" style={{ background: 'transparent' }}>
            {shows.map(show => (
              <ShowCard key={show.id} show={show} />
            ))}
          </IonList>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => navigate('/search')} aria-label="Add show">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  )
}
