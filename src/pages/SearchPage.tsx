import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  IonButton,
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
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  const { data: myShows = [] } = useShows()
  const myTmdbIds = new Set(myShows.map(s => s.tmdb_id))

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['tmdb-search', debouncedQuery],
    queryFn: () => searchShows(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  })

  const addShow = useAddShow()

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Add a Show</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={query}
            onIonInput={e => setQuery(e.detail.value ?? '')}
            placeholder="Search TV shows…"
            autoFocus
            debounce={0}
            animated
          />
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        {isFetching && (
          <div className="flex justify-center pt-8" role="status" aria-label="Searching">
            <IonSpinner name="crescent" />
          </div>
        )}

        {!isFetching && debouncedQuery.length > 2 && results.length === 0 && (
          <p
            className="text-center pt-8 px-4"
            style={{ color: 'var(--ion-color-medium)' }}
          >
            No results for "{debouncedQuery}"
          </p>
        )}

        {results.length > 0 && (
          <IonList lines="none" className="px-4 pt-2" style={{ background: 'transparent' }}>
            {results.map(result => {
              const alreadyAdded = myTmdbIds.has(String(result.id))
              return (
                <IonItem
                  key={result.id}
                  lines="none"
                  style={
                    {
                      '--border-radius': '16px',
                      marginBottom: '12px',
                    } as React.CSSProperties
                  }
                >
                  <IonThumbnail
                    slot="start"
                    style={
                      {
                        '--size': '48px',
                        '--border-radius': '8px',
                        height: '64px',
                        paddingTop: '8px',
                        paddingBottom: '8px',
                      } as React.CSSProperties
                    }
                  >
                    <img
                      src={posterUrl(result.poster_path)}
                      alt={result.name}
                      style={{ objectFit: 'cover', height: '100%', width: '100%', borderRadius: '8px' }}
                      loading="lazy"
                    />
                  </IonThumbnail>

                  <IonLabel>
                    <h2 style={{ fontWeight: 600 }}>{result.name}</h2>
                    {result.first_air_date && (
                      <p>{result.first_air_date.slice(0, 4)}</p>
                    )}
                  </IonLabel>

                  {alreadyAdded ? (
                    <p slot="end" style={{ color: 'var(--ion-color-medium)', fontSize: '0.875rem' }}>
                      Added
                    </p>
                  ) : (
                    <IonButton
                      slot="end"
                      fill="solid"
                      size="small"
                      disabled={addShow.isPending}
                      aria-label={`Add ${result.name}`}
                      onClick={async () => {
                        await addShow.mutateAsync(result)
                        navigate('/')
                      }}
                    >
                      {addShow.isPending ? 'Adding…' : 'Add'}
                    </IonButton>
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
