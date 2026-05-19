import { useState } from 'react'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonSpinner,
} from '@ionic/react'
import { useTMDBSeason } from '../hooks/useTMDBSeason'
import { posterUrl } from '../lib/tmdb'

interface BrowseEpisodesModalProps {
  tmdbId: string
  title: string
  seasons: { season_number: number; episode_count: number }[]
  initialSeason?: number
  onClose: () => void
}

export function BrowseEpisodesModal({ tmdbId, title, seasons, initialSeason, onClose }: BrowseEpisodesModalProps) {
  const [view, setView] = useState<'seasons' | 'episodes'>(initialSeason !== undefined ? 'episodes' : 'seasons')
  const [selectedSeason, setSelectedSeason] = useState(initialSeason ?? seasons[0]?.season_number ?? 1)

  const { data: seasonData, isLoading, isError } = useTMDBSeason(tmdbId, selectedSeason)

  function goToSeason(season: number) {
    setSelectedSeason(season)
    setView('episodes')
  }

  return (
    <IonModal isOpen={true} onDidDismiss={onClose} initialBreakpoint={1} breakpoints={[0, 1]}>
      <IonHeader>
        <IonToolbar>
          {view === 'episodes' && (
            <IonButtons slot="start">
              <IonButton onClick={() => setView('seasons')}>Seasons</IonButton>
            </IonButtons>
          )}
          <IonTitle>{view === 'seasons' ? title : `Season ${selectedSeason}`}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {view === 'seasons' ? (
          <SeasonList seasons={seasons} onSelect={goToSeason} />
        ) : (
          <EpisodeList
            season={selectedSeason}
            totalSeasons={seasons.length}
            episodes={seasonData?.episodes}
            isLoading={isLoading}
            isError={isError}
            onSeasonChange={setSelectedSeason}
          />
        )}
      </IonContent>
    </IonModal>
  )
}

function SeasonList({
  seasons,
  onSelect,
}: {
  seasons: { season_number: number; episode_count: number }[]
  onSelect: (season: number) => void
}) {
  return (
    <div>
      {seasons.map(s => (
        <button
          key={s.season_number}
          onClick={() => onSelect(s.season_number)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            borderBottom: '1px solid var(--ion-border-color, var(--ion-color-light))',
            width: '100%',
            textAlign: 'left',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: '16px', margin: '0 0 2px' }}>
              Season {s.season_number}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', margin: 0 }}>
              {s.episode_count} episode{s.episode_count !== 1 ? 's' : ''}
            </p>
          </div>
          <ChevronRight />
        </button>
      ))}
    </div>
  )
}

function EpisodeList({
  season,
  totalSeasons,
  episodes,
  isLoading,
  isError,
  onSeasonChange,
}: {
  season: number
  totalSeasons: number
  episodes: { episode_number: number; name: string; still_path: string | null; overview: string }[] | undefined
  isLoading: boolean
  isError: boolean
  onSeasonChange: (s: number) => void
}) {
  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 8px',
        borderBottom: '1px solid var(--ion-border-color, var(--ion-color-light))',
        position: 'sticky',
        top: 0,
        background: 'var(--ion-background-color)',
        zIndex: 10,
      }}>
        <IonButton
          fill="clear"
          size="small"
          disabled={season <= 1}
          onClick={() => onSeasonChange(season - 1)}
        >
          ← Season {season - 1}
        </IonButton>
        <IonButton
          fill="clear"
          size="small"
          disabled={season >= totalSeasons}
          onClick={() => onSeasonChange(season + 1)}
        >
          Season {season + 1} →
        </IonButton>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
          <IonSpinner name="crescent" />
        </div>
      ) : isError ? (
        <p style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ion-color-medium)', fontSize: '14px' }}>
          Couldn't load episode list. Check your connection and try again.
        </p>
      ) : (
        episodes?.map(ep => (
          <div
            key={ep.episode_number}
            style={{
              display: 'flex',
              gap: '12px',
              padding: '12px 16px',
              borderBottom: '1px solid var(--ion-border-color, var(--ion-color-light))',
              alignItems: 'flex-start',
            }}
          >
            {ep.still_path ? (
              <img
                src={posterUrl(ep.still_path)}
                alt=""
                aria-hidden="true"
                style={{
                  width: '120px',
                  height: '68px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  flexShrink: 0,
                  background: 'var(--ion-color-light)',
                }}
              />
            ) : (
              <div style={{
                width: '120px',
                height: '68px',
                borderRadius: '8px',
                background: 'var(--ion-color-light)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                opacity: 0.4,
              }}>
                📺
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>
                {ep.episode_number}. {ep.name}
              </p>
              {ep.overview ? (
                <p style={{
                  fontSize: '12px',
                  color: 'var(--ion-color-medium)',
                  margin: 0,
                  lineHeight: 1.5,
                }}>
                  {ep.overview}
                </p>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

function ChevronRight() {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" style={{ opacity: 0.35, flexShrink: 0 }}>
      <path d="M1 1l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
