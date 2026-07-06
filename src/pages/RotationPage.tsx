import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  IonItem,
  IonThumbnail,
} from '@ionic/react'
import { add } from 'ionicons/icons'
import type { ItemReorderEventDetail } from '@ionic/core'
import { useShowGroups, useUpdateShowOrder, useRefreshProviders } from '../hooks/useShows'
import { useResumeShow } from '../hooks/useResumeShow'
import { useDebounce } from '../hooks/useDebounce'
import { searchShows, posterUrl } from '../lib/tmdb'
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

  const debouncedQuery = useDebounce(searchQuery, 400)
  const { data: tmdbResults = [], isFetching: tmdbFetching } = useQuery({
    queryKey: ['tmdb-search', debouncedQuery],
    queryFn: () => searchShows(debouncedQuery),
    enabled: debouncedQuery.trim().length > 2,
  })

  const localByTmdbId = new Map([...watching, ...queue, ...done].map(s => [s.tmdb_id, s]))

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
        ) : (
          <>
            {!q && resumeData && <ResumeCard data={resumeData} />}

            {filteredWatching.length > 0 && (
              <>
                <IonListHeader style={{ paddingTop: '10px' }}>
                  <IonLabel role="heading" aria-level={2}>Watching</IonLabel>
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
                  <IonLabel role="heading" aria-level={2}>Up Next</IonLabel>
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
                  <IonLabel role="heading" aria-level={2}>Done</IonLabel>
                </IonListHeader>
                <IonList inset className="inset-shadow">
                  {filteredDone.map(show => (
                    <ShowCard key={show.id} show={show} />
                  ))}
                </IonList>
              </>
            )}

            {q.length > 2 && (
              <>
                <IonListHeader style={{ paddingTop: filteredTotal > 0 ? '4px' : '10px' }}>
                  <IonLabel role="heading" aria-level={2}>On TMDB</IonLabel>
                </IonListHeader>

                {tmdbFetching || debouncedQuery.trim().toLowerCase() !== q ? (
                  <div className="flex justify-center pt-4 pb-4" role="status" aria-label="Searching TMDB">
                    <IonSpinner name="crescent" />
                  </div>
                ) : tmdbResults.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '16px', fontSize: '13px', color: 'var(--ion-color-medium)' }}>
                    No results on TMDB for "{debouncedQuery}"
                  </p>
                ) : (
                  <IonList inset className="inset-shadow" style={{ marginBottom: '16px' }}>
                    {tmdbResults.map(result => (
                      <IonItem
                        key={result.id}
                        button
                        detail
                        onClick={() => navigate(`/tmdb/${result.id}`, { state: { result } })}
                      >
                        <IonThumbnail
                          slot="start"
                          style={
                            {
                              '--size': '44px',
                              '--border-radius': '6px',
                              height: '58px',
                              paddingTop: '8px',
                              paddingBottom: '8px',
                            } as React.CSSProperties
                          }
                        >
                          <img
                            src={posterUrl(result.poster_path)}
                            alt={result.name}
                            style={{ objectFit: 'cover', height: '100%', width: '100%', borderRadius: '6px' }}
                            loading="lazy"
                          />
                        </IonThumbnail>
                        <IonLabel>
                          <h2 style={{ fontWeight: 600, fontSize: '15px' }}>{result.name}</h2>
                          {result.first_air_date && (
                            <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                              {result.first_air_date.slice(0, 4)}
                            </p>
                          )}
                        </IonLabel>
                        {localByTmdbId.has(String(result.id)) && (
                          <span
                            slot="end"
                            style={{ fontSize: '12px', color: 'var(--ion-color-medium)', fontWeight: 500 }}
                          >
                            Added
                          </span>
                        )}
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </>
            )}

            {q && filteredTotal === 0 && q.length <= 2 && (
              <p style={{ textAlign: 'center', padding: '48px 24px 24px', fontSize: '13px', color: 'var(--ion-color-medium)' }}>
                No shows match "{searchQuery}"
              </p>
            )}
          </>
        )}
      </IonContent>

      <BottomNav />

    </IonPage>
  )
}
