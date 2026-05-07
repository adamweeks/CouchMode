import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonSpinner,
  IonFooter,
} from '@ionic/react'
import { useTMDBShow } from '../hooks/useTMDBShow'
import { useShows, useAddShow } from '../hooks/useShows'
import { posterUrl } from '../lib/tmdb'
import type { TMDBSearchResult } from '../lib/tmdb'
import { AppTabBar } from '../components/AppTabBar'

export function TMDBPreviewPage() {
  const { tmdbId } = useParams<{ tmdbId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const hint = (location.state as { result?: TMDBSearchResult } | null)?.result

  const { data: details, isLoading } = useTMDBShow(tmdbId)
  const { data: myShows = [] } = useShows()
  const addShow = useAddShow()

  const existing = myShows.find(s => s.tmdb_id === tmdbId)

  const poster = posterUrl(details?.poster_path ?? hint?.poster_path)
  const title = details?.name ?? hint?.name ?? ''
  const year = (details?.first_air_date ?? hint?.first_air_date ?? '').slice(0, 4)
  const overview = details?.overview ?? hint?.overview ?? ''
  const genres = details?.genres?.slice(0, 3).map(g => g.name).join(' · ')
  const ended = details?.status === 'Ended' || details?.status === 'Canceled'
  const seasons = details
    ? details.seasons.filter(s => s.season_number > 0)
    : []
  const totalEps = seasons.reduce((sum, s) => sum + s.episode_count, 0)

  async function handleAdd() {
    if (!details) return
    const show = await addShow.mutateAsync({
      id: details.id,
      name: details.name,
      poster_path: details.poster_path,
      first_air_date: details.first_air_date,
      overview: details.overview,
    })
    navigate(`/shows/${show.id}`, { replace: true })
  }

  return (
    <IonPage>
      <IonHeader className="gradient-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/search" />
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Poster + core info */}
        <div
          style={{
            display: 'flex',
            gap: '14px',
            padding: '16px 16px 12px',
          }}
        >
          <img
            src={poster}
            alt={title}
            style={{
              width: '90px',
              height: '135px',
              borderRadius: '10px',
              objectFit: 'cover',
              flexShrink: 0,
              background: 'var(--ion-color-light)',
            }}
          />
          <div style={{ flex: 1, minWidth: 0, paddingTop: '4px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', lineHeight: 1.2 }}>
              {title}
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: '0 0 8px' }}>
              {[year, genres, ended ? 'Ended' : details ? 'Ongoing' : null].filter(Boolean).join(' · ')}
            </p>
            {isLoading ? (
              <IonSpinner name="crescent" style={{ width: '18px', height: '18px' }} />
            ) : seasons.length > 0 ? (
              <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: 0 }}>
                {seasons.length} season{seasons.length !== 1 ? 's' : ''} · {totalEps} episodes
              </p>
            ) : null}
          </div>
        </div>

        {/* Overview */}
        {overview ? (
          <p
            style={{
              fontSize: '14px',
              lineHeight: 1.6,
              color: 'var(--ion-color-medium)',
              margin: '0 16px 20px',
            }}
          >
            {overview}
          </p>
        ) : isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <IonSpinner name="crescent" />
          </div>
        ) : null}

        {/* Seasons breakdown */}
        {seasons.length > 0 && (
          <div style={{ margin: '0 16px 24px' }}>
            <p
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--ion-color-medium)',
                marginBottom: '8px',
              }}
            >
              Seasons
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {seasons.map(s => (
                <div
                  key={s.season_number}
                  style={{
                    background: 'var(--ion-item-background)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>S{s.season_number}</span>
                  <span style={{ color: 'var(--ion-color-medium)', marginLeft: '4px' }}>
                    {s.episode_count} ep{s.episode_count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ padding: '0 16px 32px' }}>
          {existing ? (
            <IonButton expand="block" onClick={() => navigate(`/shows/${existing.id}`)}>
              View in My Rotation
            </IonButton>
          ) : (
            <IonButton
              expand="block"
              disabled={addShow.isPending || isLoading}
              onClick={handleAdd}
            >
              {addShow.isPending ? 'Adding…' : 'Add to Rotation'}
            </IonButton>
          )}
        </div>
      </IonContent>

      <IonFooter>
        <AppTabBar />
      </IonFooter>
    </IonPage>
  )
}
