import { useNavigate } from 'react-router-dom'
import {
  IonItem,
  IonLabel,
  IonThumbnail,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonIcon,
  IonReorder,
} from '@ionic/react'
import { playOutline, trashOutline } from 'ionicons/icons'
import type { Database } from '../lib/database.types'
import type { TMDBWatchProvider } from '../lib/tmdb'
import { providerLogoUrl } from '../lib/tmdb'
import { useRewatches } from '../hooks/useRewatches'
import { useRemoveShow } from '../hooks/useShows'
import { useLogEpisodeSheet } from '../hooks/useLogEpisodeSheet'

type Show = Database['public']['Tables']['shows']['Row']

function StreamingProviders({ providers }: { providers: TMDBWatchProvider[] | null }) {
  if (!providers || providers.length === 0) return null
  return (
    <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
      {providers.map(p => (
        <img
          key={p.provider_id}
          src={providerLogoUrl(p.logo_path)}
          alt={p.provider_name}
          title={p.provider_name}
          style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }}
        />
      ))}
    </div>
  )
}

export function WatchlistCard({ show, queuePosition }: { show: Show; queuePosition: number }) {
  const navigate = useNavigate()
  const { data: rewatches = [] } = useRewatches(show.id)
  const activeRewatch = rewatches.find(r => r.status === 'in_progress') ?? null
  const { mutate: removeShow } = useRemoveShow()

  const { present: presentLogSheet } = useLogEpisodeSheet(show, activeRewatch?.id, null)

  return (
    <>
      <IonItemSliding>
        <IonItem button detail onClick={() => navigate(`/tmdb/${show.tmdb_id}`)}>
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
              src={show.poster_url ?? '/placeholder-poster.svg'}
              alt={show.title}
              loading="lazy"
              style={{ objectFit: 'cover', height: '100%', width: '100%', borderRadius: '6px' }}
            />
          </IonThumbnail>

          <IonLabel>
            <h2 style={{ fontWeight: 600, fontSize: '15px', marginBottom: '2px' }}>{show.title}</h2>
            <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>Not started</p>
            <StreamingProviders providers={show.streaming_providers as TMDBWatchProvider[] | null} />
          </IonLabel>

          <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '4px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--ion-color-light)',
                color: 'var(--ion-color-medium)',
                borderRadius: '20px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              #{queuePosition}
            </span>
            <IonReorder />
          </div>
        </IonItem>

        <IonItemOptions side="start" onIonSwipe={presentLogSheet}>
          <IonItemOption color="primary" expandable onClick={presentLogSheet}>
            <div
              slot="icon-only"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}
            >
              <IonIcon icon={playOutline} style={{ fontSize: '18px' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>START</span>
            </div>
          </IonItemOption>
        </IonItemOptions>

        <IonItemOptions side="end" onIonSwipe={() => removeShow(show.id)}>
          <IonItemOption color="danger" expandable onClick={() => removeShow(show.id)}>
            <IonIcon slot="icon-only" icon={trashOutline} />
          </IonItemOption>
        </IonItemOptions>
      </IonItemSliding>
    </>
  )
}
