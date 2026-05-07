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
  IonActionSheet,
  IonReorderGroup,
  IonSearchbar,
} from '@ionic/react'
import type { ItemReorderEventDetail } from '@ionic/core'
import { add, ellipsisHorizontalOutline } from 'ionicons/icons'
import { useShows, useUpdateShowOrder } from '../hooks/useShows'
import type { SortOption } from '../hooks/useShows'
import { ShowCard } from '../components/ShowCard'
import { AppTabBar } from '../components/AppTabBar'

type FilterTab = 'all' | 'watching' | 'done'

const SORT_LABELS: Record<SortOption, string> = {
  added_at: 'Date Added',
  title: 'Title A–Z',
  manual: 'Custom Order',
}

export function RotationPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    return (localStorage.getItem('couchmode:sort') as SortOption) ?? 'added_at'
  })
  const [showSortSheet, setShowSortSheet] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: shows = [], isLoading } = useShows(sortOption)
  const { mutate: updateOrder } = useUpdateShowOrder()

  // Manual mode always shows all shows so IonReorderGroup indices stay consistent
  const activeFilter: FilterTab = sortOption === 'manual' ? 'all' : filter

  const filteredShows = searchQuery.trim()
    ? shows.filter(show => show.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : shows

  function handleSortChange(newSort: SortOption) {
    if (newSort === 'manual' && sortOption !== 'manual') {
      updateOrder(shows.map((show, i) => ({ id: show.id, sort_order: i })))
    }
    setSortOption(newSort)
    localStorage.setItem('couchmode:sort', newSort)
  }

  function handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const reordered = event.detail.complete(shows) as typeof shows
    updateOrder(reordered.map((show, i) => ({ id: show.id, sort_order: i })))
  }

  return (
    <IonPage>
      <IonHeader className="gradient-header">
        <IonToolbar>
          <IonTitle>My Rotation</IonTitle>
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
        <IonSegment
          value={activeFilter}
          onIonChange={e => setFilter(e.detail.value as FilterTab)}
          disabled={sortOption === 'manual'}
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
        ) : filteredShows.length === 0 ? (
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
            <span style={{ fontSize: '48px', opacity: 0.3, marginBottom: '12px' }}>🔍</span>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No matches</h2>
            <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', lineHeight: 1.5 }}>
              No shows match "{searchQuery}".
            </p>
          </div>
        ) : (
          <IonList inset className="inset-shadow" style={{ marginTop: '10px' }}>
            <IonReorderGroup
              disabled={sortOption !== 'manual'}
              onIonItemReorder={handleReorder}
            >
              {filteredShows.map(show => (
                <ShowCard
                  key={show.id}
                  show={show}
                  filter={activeFilter}
                  reorderMode={sortOption === 'manual'}
                />
              ))}
            </IonReorderGroup>
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
            text: `Custom Order${sortOption === 'manual' ? ' ✓' : ''}`,
            handler: () => handleSortChange('manual'),
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
