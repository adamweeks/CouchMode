import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonSpinner,
  IonButtons,
  IonBackButton,
  IonFooter,
} from '@ionic/react'
import { searchShows, posterUrl } from '../lib/tmdb'
import { AppTabBar } from '../components/AppTabBar'
import { useShows, useAddShow } from '../hooks/useShows'
import { useDebounce } from '../hooks/useDebounce'

export function SearchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [query, setQuery] = useState<string>((location.state as { query?: string } | null)?.query ?? '')
  const debouncedQuery = useDebounce(query, 300)

  const { data: myShows = [] } = useShows()
  const myShowsByTmdbId = new Map(myShows.map(s => [s.tmdb_id, s]))

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['tmdb-search', debouncedQuery],
    queryFn: () => searchShows(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  })

  const addShow = useAddShow()

  return (
    <IonPage>
      <IonHeader className="gradient-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Add a Show</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            className="gradient-searchbar"
            value={query}
            onIonInput={e => setQuery(e.detail.value ?? '')}
            placeholder="Search TV shows…"
            autoFocus
            debounce={0}
            animated={false}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {isFetching && (
          <div className="flex justify-center pt-8" role="status" aria-label="Searching">
            <IonSpinner name="crescent" />
          </div>
        )}

        {!isFetching && debouncedQuery.length > 2 && results.length === 0 && (
          <p className="text-center pt-8 px-4" style={{ color: 'var(--ion-color-medium)' }}>
            No results for "{debouncedQuery}"
          </p>
        )}

        {!isFetching && debouncedQuery.length <= 2 && (
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

        {results.length > 0 && (
          <IonList inset className="inset-shadow" style={{ marginTop: '10px' }}>
            {results.map(result => {
              const existing = myShowsByTmdbId.get(String(result.id))
              return (
                <IonItem
                  key={result.id}
                  button
                  detail
                  disabled={addShow.isPending}
                  onClick={async () => {
                    if (existing) {
                      navigate(`/shows/${existing.id}`)
                    } else {
                      const show = await addShow.mutateAsync(result)
                      navigate(`/shows/${show.id}`)
                    }
                  }}
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
      </IonContent>

      <IonFooter>
        <AppTabBar />
      </IonFooter>
    </IonPage>
  )
}
