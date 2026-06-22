import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSpinner,
  IonList,
  IonListHeader,
  IonLabel,
  IonReorderGroup,
  IonSearchbar,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react'
import { add } from 'ionicons/icons'
import type { ItemReorderEventDetail } from '@ionic/core'
import { useShowGroups, useUpdateShowOrder, useRefreshProviders } from '../hooks/useShows'
import { useResumeShow } from '../hooks/useResumeShow'
import { ShowCard } from '../components/ShowCard'
import { ResumeCard } from '../components/ResumeCard'
import { WatchlistCard } from '../components/WatchlistCard'
import { BottomNav } from '../components/BottomNav'

export function RotationPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useShowGroups()
  const { data: resumeData } = useResumeShow()
  const { mutate: updateOrder } = useUpdateShowOrder()

  const watching = data?.watching ?? []
  const queue = data?.queue ?? []
  const done = data?.done ?? []
  const totalShows = watching.length + queue.length + done.length

  const refreshProviders = useRefreshProviders()
  useEffect(() => {
    refreshProviders()
  }, [refreshProviders])

  const q = searchQuery.toLowerCase().trim()
  const filteredWatching = q ? watching.filter(s => s.title.toLowerCase().includes(q)) : watching
  const filteredQueue = q ? queue.filter(s => s.title.toLowerCase().includes(q)) : queue
  const filteredDone = q ? done.filter(s => s.title.toLowerCase().includes(q)) : done
  const filteredTotal = filteredWatching.length + filteredQueue.length + filteredDone.length

  function handleQueueReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const reordered = event.detail.complete(queue) as typeof queue
    updateOrder(reordered.map((show, i) => ({ id: show.id, sort_order: i })))
  }

  return (
    <IonPage>
      <IonHeader className="gradient-header">
        <IonToolbar>
          <IonTitle>My Shows</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => navigate('/search')} aria-label="Add show">
              <IonIcon slot="icon-only" icon={add} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            className="gradient-searchbar"
            placeholder="Find a show…"
            value={searchQuery}
            onIonInput={e => setSearchQuery(e.detail.value ?? '')}
            onIonClear={() => setSearchQuery('')}
            debounce={150}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent className="tab-page-content">
        {isLoading ? (
          <div className="flex justify-center pt-16" role="status" aria-label="Loading shows">
            <IonSpinner name="crescent" />
          </div>
        ) : totalShows === 0 ? (
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
            <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', lineHeight: 1.5 }}>
              Tap + to search for a show and start tracking your rewatches.
            </p>
          </div>
        ) : filteredTotal === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 24px 24px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '48px', opacity: 0.3, marginBottom: '12px' }}>🔍</span>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No matches</h2>
            <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', lineHeight: 1.5 }}>
              No shows match "{searchQuery}".
            </p>
            <IonButton
              fill="clear"
              style={{ marginTop: '8px' }}
              onClick={() => navigate('/search', { state: { query: searchQuery } })}
            >
              Search TMDB for "{searchQuery}"
            </IonButton>
          </div>
        ) : (
          <>
            {!q && resumeData && <ResumeCard data={resumeData} />}

            {filteredWatching.length > 0 && (
              <>
                <IonListHeader style={{ paddingTop: '10px' }}>
                  <IonLabel>Watching</IonLabel>
                </IonListHeader>
                <IonList inset className="inset-shadow">
                  {filteredWatching.map(show => (
                    <ShowCard key={show.id} show={show} />
                  ))}
                </IonList>
              </>
            )}

            {filteredQueue.length > 0 && (
              <>
                <IonListHeader style={{ paddingTop: filteredWatching.length > 0 ? '4px' : '10px' }}>
                  <IonLabel>Up Next</IonLabel>
                </IonListHeader>
                <IonList inset className="inset-shadow">
                  <IonReorderGroup disabled={!!q} onIonItemReorder={handleQueueReorder}>
                    {filteredQueue.map((show, i) => (
                      <WatchlistCard key={show.id} show={show} queuePosition={i + 1} />
                    ))}
                  </IonReorderGroup>
                </IonList>
              </>
            )}

            {filteredDone.length > 0 && (
              <>
                <IonListHeader style={{ paddingTop: filteredWatching.length > 0 || filteredQueue.length > 0 ? '4px' : '10px' }}>
                  <IonLabel>Done</IonLabel>
                </IonListHeader>
                <IonList inset className="inset-shadow">
                  {filteredDone.map(show => (
                    <ShowCard key={show.id} show={show} />
                  ))}
                </IonList>
              </>
            )}
          </>
        )}
      </IonContent>

      <BottomNav />

    </IonPage>
  )
}
