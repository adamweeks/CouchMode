import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  IonLabel,
  IonThumbnail,
  IonFooter,
  IonReorderGroup,
  IonSearchbar,
} from '@ionic/react'
import type { ItemReorderEventDetail } from '@ionic/core'
import { add, searchOutline, arrowBackOutline } from 'ionicons/icons'
import { useShowGroups, useUpdateShowOrder, useRefreshProviders } from '../hooks/useShows'
import { ShowCard } from '../components/ShowCard'
import { WatchlistCard } from '../components/WatchlistCard'
import { AppTabBar } from '../components/AppTabBar'
import { searchShows, posterUrl } from '../lib/tmdb'
import { useDebounce } from '../hooks/useDebounce'

export function RotationPage() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [tmdbMode, setTmdbMode] = useState(false)

  const { data, isLoading } = useShowGroups()
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

  const debouncedQuery = useDebounce(searchQuery, 300)
  const allMyShows = [...watching, ...queue, ...done]
  const myShowsByTmdbId = new Map(allMyShows.map(s => [s.tmdb_id, s]))

  const { data: tmdbResults = [], isFetching: tmdbFetching } = useQuery({
    queryKey: ['tmdb-search', debouncedQuery],
    queryFn: () => searchShows(debouncedQuery),
    enabled: tmdbMode && debouncedQuery.length > 2,
  })

  useEffect(() => {
    if (!searchQuery) setTmdbMode(false)
  }, [searchQuery])

  function handleQueueReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const reordered = event.detail.complete(queue) as typeof queue
    updateOrder(reordered.map((show, i) => ({ id: show.id, sort_order: i })))
  }

  function enterTmdbMode() {
    setTmdbMode(true)
  }

  function exitTmdbMode() {
    setTmdbMode(false)
    setSearchQuery('')
  }

  return (
    <IonPage>
      <IonHeader className="gradient-header">
        <IonToolbar>
          {tmdbMode && (
            <IonButtons slot="start">
              <IonButton onClick={exitTmdbMode} aria-label="Back to my shows">
                <IonIcon slot="icon-only" icon={arrowBackOutline} />
              </IonButton>
            </IonButtons>
          )}
          <IonTitle>{tmdbMode ? 'Add a Show' : 'My Shows'}</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            className="gradient-searchbar"
            placeholder={tmdbMode ? 'Search TV shows…' : 'Find a show…'}
            value={searchQuery}
            onIonInput={e => setSearchQuery(e.detail.value ?? '')}
            onIonClear={() => { setSearchQuery(''); setTmdbMode(false) }}
            debounce={150}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {tmdbMode ? (
          <>
            {tmdbFetching && (
              <div className="flex justify-center pt-8" role="status" aria-label="Searching">
                <IonSpinner name="crescent" />
              </div>
            )}

            {!tmdbFetching && debouncedQuery.length > 2 && tmdbResults.length === 0 && (
              <p className="text-center pt-8 px-4" style={{ color: 'var(--ion-color-medium)' }}>
                No results for "{debouncedQuery}"
              </p>
            )}

            {!tmdbFetching && debouncedQuery.length <= 2 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  paddingTop: '48px',
                  paddingBottom: '24px',
                  color: 'var(--ion-color-medium)',
                  textAlign: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '40px', opacity: 0.3 }}>🔍</span>
                <p style={{ fontSize: '14px' }}>Search for a show to add to your rotation</p>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px 4px',
                opacity: 0.6,
              }}
            >
              <img
                src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                alt="Powered by TMDB"
                style={{ height: '14px', width: 'auto' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--ion-color-medium)' }}>Powered by TMDB</span>
            </div>

            {tmdbResults.length > 0 && (
              <IonList inset className="inset-shadow" style={{ marginTop: '10px' }}>
                {tmdbResults.map(result => {
                  const existing = myShowsByTmdbId.get(String(result.id))
                  return (
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
                            marginRight: '12px',
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

                      {existing && (
                        <span
                          slot="end"
                          style={{
                            fontSize: '12px',
                            color: 'var(--ion-color-medium)',
                            fontWeight: 500,
                          }}
                        >
                          Added
                        </span>
                      )}
                    </IonItem>
                  )
                })}
              </IonList>
            )}
          </>
        ) : isLoading ? (
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
            <IonButton onClick={enterTmdbMode}>Find a Show</IonButton>
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
              <IonItem button detail onClick={enterTmdbMode}>
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
                <IonItem button detail onClick={enterTmdbMode}>
                  <IonIcon slot="start" icon={searchOutline} style={{ color: 'var(--ion-color-medium)' }} />
                  <span>Search <strong>"{searchQuery}"</strong> on TMDB</span>
                </IonItem>
              </IonList>
            )}
          </>
        )}

        {!tmdbMode && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={enterTmdbMode} aria-label="Add show">
              <IonIcon icon={add} />
            </IonFabButton>
          </IonFab>
        )}
      </IonContent>

      <IonFooter>
        <AppTabBar />
      </IonFooter>

    </IonPage>
  )
}
