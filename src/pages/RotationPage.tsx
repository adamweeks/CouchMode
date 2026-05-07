import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonButton,
  IonButtons,
  IonList,
  IonListHeader,
  IonItem,
  IonFooter,
  IonActionSheet,
  IonReorderGroup,
  IonSearchbar,
  IonLabel,
} from '@ionic/react'
import type { ItemReorderEventDetail } from '@ionic/core'
import { add, ellipsisHorizontalOutline, searchOutline } from 'ionicons/icons'
import { useShowGroups, useUpdateShowOrder } from '../hooks/useShows'
import type { GroupSortOption } from '../hooks/useShows'
import { ShowCard } from '../components/ShowCard'
import { WatchlistCard } from '../components/WatchlistCard'
import { AppTabBar } from '../components/AppTabBar'

const SORT_LABELS: Record<GroupSortOption, string> = {
  added_at: 'Date Added',
  title: 'Title A–Z',
}

export function RotationPage() {
  const navigate = useNavigate()
  const [sortOption, setSortOption] = useState<GroupSortOption>(() => {
    const stored = localStorage.getItem('couchmode:sort')
    return stored === 'title' ? 'title' : 'added_at'
  })
  const [showSortSheet, setShowSortSheet] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading } = useShowGroups(sortOption)
  const { mutate: updateOrder } = useUpdateShowOrder()

  const watching = data?.watching ?? []
  const queue = data?.queue ?? []
  const done = data?.done ?? []
  const totalShows = watching.length + queue.length + done.length

  const q = searchQuery.toLowerCase().trim()
  const filteredWatching = q ? watching.filter(s => s.title.toLowerCase().includes(q)) : watching
  const filteredQueue = q ? queue.filter(s => s.title.toLowerCase().includes(q)) : queue
  const filteredDone = q ? done.filter(s => s.title.toLowerCase().includes(q)) : done
  const filteredTotal = filteredWatching.length + filteredQueue.length + filteredDone.length

  function handleSortChange(newSort: GroupSortOption) {
    setSortOption(newSort)
    localStorage.setItem('couchmode:sort', newSort)
  }

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
            <IonButton onClick={() => setShowSortSheet(true)} aria-label="Sort options">
              <IonIcon slot="icon-only" icon={ellipsisHorizontalOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            className="gradient-searchbar"
            placeholder="Filter shows…"
            value={searchQuery}
            onIonInput={e => setSearchQuery(e.detail.value ?? '')}
            onIonClear={() => setSearchQuery('')}
            debounce={150}
          />
        </IonToolbar>
        {sortOption !== 'added_at' && (
          <div
            style={{
              textAlign: 'center',
              fontSize: '11px',
              color: 'var(--ion-color-medium)',
              paddingBottom: '4px',
            }}
          >
            Sorted by: {SORT_LABELS[sortOption]}
          </div>
        )}
      </IonHeader>

      <IonContent>
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
            <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', lineHeight: 1.5, marginBottom: '20px' }}>
              Add a show to start tracking your rewatches or build your queue.
            </p>
            <IonButton onClick={() => navigate('/search')}>Find a Show</IonButton>
          </div>
        ) : filteredTotal === 0 ? (
          <>
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
            </div>
            <IonList inset className="inset-shadow">
              <IonItem button detail onClick={() => navigate('/search', { state: { query: searchQuery } })}>
                <IonIcon slot="start" icon={searchOutline} style={{ color: 'var(--ion-color-medium)' }} />
                <span>Search <strong>"{searchQuery}"</strong> on TMDB</span>
              </IonItem>
            </IonList>
          </>
        ) : (
          <>
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

            {q && (
              <IonList inset className="inset-shadow">
                <IonItem button detail onClick={() => navigate('/search', { state: { query: searchQuery } })}>
                  <IonIcon slot="start" icon={searchOutline} style={{ color: 'var(--ion-color-medium)' }} />
                  <span>Search <strong>"{searchQuery}"</strong> on TMDB</span>
                </IonItem>
              </IonList>
            )}
          </>
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

      <IonActionSheet
        isOpen={showSortSheet}
        onDidDismiss={() => setShowSortSheet(false)}
        header="Sort Shows"
        buttons={[
          {
            text: `Date Added${sortOption === 'added_at' ? ' ✓' : ''}`,
            handler: () => handleSortChange('added_at'),
          },
          {
            text: `Title A–Z${sortOption === 'title' ? ' ✓' : ''}`,
            handler: () => handleSortChange('title'),
          },
          {
            text: 'Cancel',
            role: 'cancel',
          },
        ]}
      />
    </IonPage>
  )
}
