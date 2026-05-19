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
  useIonAlert,
} from '@ionic/react'
import { useTMDBSeason } from '../hooks/useTMDBSeason'
import { useProgressLogs, useLogProgress } from '../hooks/useProgressLogs'
import { getCurrentProgress, isRegression, formatProgress, getErrorMessage } from '../lib/progressLogic'
import { posterUrl } from '../lib/tmdb'

type View = 'seasons' | 'episodes'

interface LogProgressModalProps {
  show: {
    id: string
    tmdb_id: string
    title: string
    total_seasons: number
    episodes_per_season: number[]
  }
  rewatchId: string
  onClose: () => void
}

export function LogProgressModal({ show, rewatchId, onClose }: LogProgressModalProps) {
  const { data: logs = [] } = useProgressLogs(rewatchId)
  const currentProgress = getCurrentProgress(logs)

  const [view, setView] = useState<View>('seasons')
  const [selectedSeason, setSelectedSeason] = useState(currentProgress?.season ?? 1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [presentAlert] = useIonAlert()
  const logProgress = useLogProgress()

  // Fetch selected season in background so it's ready when the user drills in
  const { data: seasonData, isLoading: isLoadingEpisodes, isError: isEpisodeError } = useTMDBSeason(show.tmdb_id, selectedSeason)

  async function doLog(season: number, episode: number) {
    setIsSubmitting(true)
    try {
      await logProgress.mutateAsync({
        rewatchId,
        showId: show.id,
        season,
        episode,
        totalSeasons: show.total_seasons,
        episodesPerSeason: show.episodes_per_season,
      })
      onClose()
    } catch (e) {
      setIsSubmitting(false)
      presentAlert({ header: 'Error', message: getErrorMessage(e), buttons: ['OK'] })
    }
  }

  function handleEpisodeTap(episode: number) {
    if (isRegression(selectedSeason, episode, currentProgress)) {
      presentAlert({
        header: 'Going back?',
        message: `This is earlier than your current progress${
          currentProgress ? ` (${formatProgress(currentProgress.season, currentProgress.episode)})` : ''
        }. What's happening?`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'I started over', handler: () => doLog(selectedSeason, episode) },
        ],
      })
      return
    }
    doLog(selectedSeason, episode)
  }

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
          <IonTitle>{view === 'seasons' ? show.title : `Season ${selectedSeason}`}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {view === 'seasons' ? (
          <SeasonList
            totalSeasons={show.total_seasons}
            episodesPerSeason={show.episodes_per_season}
            currentProgress={currentProgress}
            disabled={isSubmitting}
            onSelect={goToSeason}
          />
        ) : (
          <EpisodeList
            season={selectedSeason}
            totalSeasons={show.total_seasons}
            episodes={seasonData?.episodes}
            isLoading={isLoadingEpisodes}
            isError={isEpisodeError}
            currentProgress={currentProgress}
            disabled={isSubmitting}
            onSeasonChange={setSelectedSeason}
            onEpisodeTap={handleEpisodeTap}
          />
        )}
      </IonContent>
    </IonModal>
  )
}

function SeasonList({
  totalSeasons,
  episodesPerSeason,
  currentProgress,
  disabled,
  onSelect,
}: {
  totalSeasons: number
  episodesPerSeason: number[]
  currentProgress: { season: number; episode: number } | null | undefined
  disabled: boolean
  onSelect: (season: number) => void
}) {
  return (
    <div>
      {Array.from({ length: totalSeasons }, (_, i) => i + 1).map(season => {
        const count = episodesPerSeason[season - 1] ?? 0
        const isCurrent = season === currentProgress?.season
        return (
          <button
            key={season}
            onClick={() => onSelect(season)}
            disabled={disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              borderBottom: '1px solid var(--ion-border-color, var(--ion-color-light))',
              width: '100%',
              textAlign: 'left',
              background: isCurrent ? 'rgba(var(--ion-color-primary-rgb), 0.08)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{
                fontWeight: 600,
                fontSize: '16px',
                margin: '0 0 2px',
                color: isCurrent ? 'var(--ion-color-primary)' : undefined,
              }}>
                Season {season}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', margin: 0 }}>
                {count} episode{count !== 1 ? 's' : ''}
                {isCurrent && currentProgress && ` · on episode ${currentProgress.episode}`}
              </p>
            </div>
            <ChevronRight />
          </button>
        )
      })}
    </div>
  )
}

function EpisodeList({
  season,
  totalSeasons,
  episodes,
  isLoading,
  isError,
  currentProgress,
  disabled,
  onSeasonChange,
  onEpisodeTap,
}: {
  season: number
  totalSeasons: number
  episodes: { episode_number: number; name: string; still_path: string | null; overview: string }[] | undefined
  isLoading: boolean
  isError: boolean
  currentProgress: { season: number; episode: number } | null | undefined
  disabled: boolean
  onSeasonChange: (s: number) => void
  onEpisodeTap: (episode: number) => void
}) {
  return (
    <div>
      {/* Season prev/next navigation */}
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
          disabled={season <= 1 || disabled}
          onClick={() => onSeasonChange(season - 1)}
        >
          ← Season {season - 1}
        </IonButton>
        <IonButton
          fill="clear"
          size="small"
          disabled={season >= totalSeasons || disabled}
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
        episodes?.map(ep => {
          const isCurrent = season === currentProgress?.season && ep.episode_number === currentProgress?.episode
          return (
            <div
              key={ep.episode_number}
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px 16px',
                borderBottom: '1px solid var(--ion-border-color, var(--ion-color-light))',
                background: isCurrent ? 'rgba(var(--ion-color-primary-rgb), 0.08)' : 'transparent',
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
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    margin: 0,
                    color: isCurrent ? 'var(--ion-color-primary)' : undefined,
                  }}>
                    {ep.episode_number}. {ep.name}
                  </p>
                  {isCurrent && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      background: 'var(--ion-color-primary)',
                      color: '#fff',
                      borderRadius: '4px',
                      padding: '1px 5px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      flexShrink: 0,
                    }}>
                      current
                    </span>
                  )}
                </div>
                {ep.overview ? (
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--ion-color-medium)',
                    margin: '0 0 8px',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as const,
                  }}>
                    {ep.overview}
                  </p>
                ) : null}
                <IonButton
                  size="small"
                  fill="outline"
                  disabled={disabled}
                  onClick={() => onEpisodeTap(ep.episode_number)}
                  style={{ marginTop: ep.overview ? 0 : '8px' }}
                >
                  Log episode
                </IonButton>
              </div>
            </div>
          )
        })
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
