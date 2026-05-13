import { useNavigate } from 'react-router-dom'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonSpinner,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonButton,
} from '@ionic/react'
import { useSuggestions } from '../hooks/useSuggestions'
import { useShowGroups } from '../hooks/useShows'
import { posterUrl } from '../lib/tmdb'
import { AppTabBar } from '../components/AppTabBar'
import { TmdbAttribution } from '../components/TmdbAttribution'

export function SuggestionsPage() {
  const navigate = useNavigate()
  const { data: suggestions = [], isLoading, refetch } = useSuggestions()
  const { data: groups, isLoading: showsLoading } = useShowGroups()

  const hasShows =
    (groups?.watching.length ?? 0) +
    (groups?.queue.length ?? 0) +
    (groups?.done.length ?? 0) > 0

  const loading = isLoading || showsLoading

  return (
    <IonPage>
      <IonHeader className="gradient-header">
        <IonToolbar>
          <IonTitle>Suggested for You</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading ? (
          <div className="flex justify-center pt-16" role="status" aria-label="Loading suggestions">
            <IonSpinner name="crescent" />
          </div>
        ) : !hasShows ? (
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
            <span style={{ fontSize: '48px', opacity: 0.3, marginBottom: '12px' }}>✨</span>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No suggestions yet</h2>
            <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', lineHeight: 1.5, marginBottom: '20px' }}>
              Add some shows to your rotation and we'll suggest similar ones you might enjoy.
            </p>
            <IonButton onClick={() => navigate('/')}>Browse My Shows</IonButton>
          </div>
        ) : suggestions.length === 0 ? (
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
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Nothing new to suggest</h2>
            <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', lineHeight: 1.5, marginBottom: '20px' }}>
              Looks like you've already added all the shows similar to what you watch. Try refreshing or adding more shows.
            </p>
            <IonButton onClick={() => refetch()}>Refresh</IonButton>
          </div>
        ) : (
          <>
            <TmdbAttribution />
            <IonList inset className="inset-shadow" style={{ marginTop: '10px' }}>
              {suggestions.map(({ result, becauseOf }) => (
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
                    <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                      Because you watched {becauseOf}
                      {result.first_air_date ? ` · ${result.first_air_date.slice(0, 4)}` : ''}
                    </p>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </>
        )}
      </IonContent>

      <IonFooter>
        <AppTabBar />
      </IonFooter>
    </IonPage>
  )
}
