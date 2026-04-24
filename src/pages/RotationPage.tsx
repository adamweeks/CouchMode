import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonButton,
  IonButtons,
  IonFooter,
} from '@ionic/react'
import { add } from 'ionicons/icons'
import { useShows } from '../hooks/useShows'
import { ShowCard } from '../components/ShowCard'
import { AppTabBar } from '../components/AppTabBar'

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

type FilterTab = 'all' | 'watching' | 'done'

export function RotationPage() {
  const navigate = useNavigate()
  const { data: shows = [], isLoading } = useShows()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterTab>('all')

  const filteredShows = useMemo(() => {
    if (!search.trim()) return shows
    const q = search.toLowerCase()
    return shows.filter(s => s.title.toLowerCase().includes(q))
  }, [shows, search])

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Rotation</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => navigate('/search')} aria-label="Add show">
              <IonIcon slot="icon-only" icon={add} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={search}
            onIonInput={e => setSearch(e.detail.value ?? '')}
            placeholder="Search your shows…"
            debounce={150}
            animated={false}
          />
        </IonToolbar>
        <IonToolbar>
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
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {isLoading ? (
          <div className="flex justify-center pt-16" role="status" aria-label="Loading shows">
            <IonSpinner name="crescent" />
          </div>
        ) : shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center px-8 gap-4">
            <TvIcon className="w-16 h-16 text-gray-500" />
            <h2 className="text-xl font-semibold">No shows yet</h2>
            <p className="text-sm max-w-xs" style={{ color: 'var(--ion-color-medium)' }}>
              Add the shows you rewatch regularly to start tracking your progress.
            </p>
            <IonButton onClick={() => navigate('/search')} style={{ marginTop: '0.5rem' }}>
              Add Your First Show
            </IonButton>
          </div>
        ) : filteredShows.length === 0 ? (
          <p className="text-center pt-8 px-4" style={{ color: 'var(--ion-color-medium)' }}>
            No shows matching "{search}"
          </p>
        ) : (
          <div className="pt-2 pb-6">
            {filteredShows.map(show => (
              <ShowCard key={show.id} show={show} filter={filter} />
            ))}
          </div>
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
