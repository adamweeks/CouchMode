import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonButton,
  IonButtons,
  IonList,
  IonFooter,
} from '@ionic/react'
import { add, searchOutline, ellipsisHorizontalOutline } from 'ionicons/icons'
import { useShows } from '../hooks/useShows'
import { ShowCard } from '../components/ShowCard'
import { AppTabBar } from '../components/AppTabBar'

type FilterTab = 'all' | 'watching' | 'done'

export function RotationPage() {
  const navigate = useNavigate()
  const { data: shows = [], isLoading } = useShows()
  const [filter, setFilter] = useState<FilterTab>('all')

  return (
    <IonPage>
      <IonHeader className="gradient-header">
        <IonToolbar>
          <IonTitle>My Rotation</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => navigate('/search')} aria-label="Search shows">
              <IonIcon slot="icon-only" icon={searchOutline} />
            </IonButton>
            <IonButton aria-label="More options">
              <IonIcon slot="icon-only" icon={ellipsisHorizontalOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonSegment
          value={filter}
          onIonChange={e => setFilter(e.detail.value as FilterTab)}
        >
          <IonSegmentButton value="all">
            <IonLabel>All</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="watching">
            <IonLabel>Watching</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="done">
            <IonLabel>Done</IonLabel>
          </IonSegmentButton>
        </IonSegment>
      </IonHeader>

      <IonContent>
        {isLoading ? (
          <div className="flex justify-center pt-16" role="status" aria-label="Loading shows">
            <IonSpinner name="crescent" />
          </div>
        ) : shows.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '48px', opacity: 0.3, marginBottom: '12px' }}>📺</span>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No shows yet</h2>
            <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', lineHeight: 1.5, marginBottom: '20px' }}>
              Add a show you love rewatching and start tracking your progress.
            </p>
            <IonButton onClick={() => navigate('/search')}>Find a Show</IonButton>
          </div>
        ) : (
          <IonList inset className="inset-shadow" style={{ marginTop: '10px' }}>
            {shows.map(show => (
              <ShowCard key={show.id} show={show} filter={filter} />
            ))}
          </IonList>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => navigate('/search')} aria-label="Add show">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>

      <IonFooter>
        <AppTabBar />
      </IonFooter>
    </IonPage>
  )
}
