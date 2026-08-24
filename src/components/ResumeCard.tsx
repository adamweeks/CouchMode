import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IonButton, IonIcon } from '@ionic/react'
import { playOutline, playSkipForwardOutline, timeOutline } from 'ionicons/icons'
import { useLogEpisodeSheet } from '../hooks/useLogEpisodeSheet'
import { useTMDBSeason } from '../hooks/useTMDBSeason'
import { usePreferences } from '../contexts/PreferencesContext'
import { formatProgress } from '../lib/progressLogic'
import { LogProgressModal } from './LogProgressModal'
import { StatusLine } from './StatusLine'
import type { ResumeShowData } from '../hooks/useResumeShow'

export function ResumeCard({ data }: { data: ResumeShowData }) {
  const navigate = useNavigate()
  const [logModalOpen, setLogModalOpen] = useState(false)
  const { show, rewatchId, currentProgress } = data
  const { preferences } = usePreferences()
  const showLastWatched = preferences.resumeCardMode === 'last-watched'

  const { logNext, nextEp } = useLogEpisodeSheet(
    show,
    rewatchId,
    currentProgress,
    () => setLogModalOpen(true),
  )

  // The card always logs the *next* episode, but which one it names is a
  // user preference: the episode coming up, or the one they last logged.
  const displaySeason = showLastWatched ? currentProgress.season : nextEp?.season ?? 0
  const displayEpisode = showLastWatched ? currentProgress.episode : nextEp?.episode

  const { data: seasonData } = useTMDBSeason(show.tmdb_id, displaySeason)
  const displayEpisodeName = displayEpisode
    ? seasonData?.episodes?.find(e => e.episode_number === displayEpisode)?.name
    : undefined

  if (!nextEp || !logNext || displayEpisode === undefined) return null

  return (
    <>
      <div
        style={{
          margin: '12px 16px 4px',
          background: 'linear-gradient(135deg, rgba(var(--ion-color-primary-rgb), 0.12) 0%, rgba(var(--ion-color-primary-rgb), 0.04) 100%)',
          border: '1px solid rgba(var(--ion-color-primary-rgb), 0.25)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <img
          src={show.poster_url ?? '/placeholder-poster.svg'}
          alt={show.title}
          onClick={() => navigate(`/tmdb/${show.tmdb_id}`)}
          style={{
            width: '44px',
            height: '58px',
            objectFit: 'cover',
            borderRadius: '6px',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        />

        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={() => navigate(`/tmdb/${show.tmdb_id}`)}
        >
          <p style={{
            fontSize: '10px',
            color: 'var(--ion-color-primary)',
            fontWeight: 700,
            marginBottom: '2px',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
          }}>
            Continue Watching
          </p>
          <h3 style={{
            fontWeight: 700,
            fontSize: '15px',
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {show.title}
          </h3>
          <StatusLine
            icon={showLastWatched ? timeOutline : playSkipForwardOutline}
            label={showLastWatched ? 'Last watched' : 'Up next'}
            detail={
              formatProgress(displaySeason, displayEpisode) +
              (displayEpisodeName ? ` · ${displayEpisodeName}` : '')
            }
          />
        </div>

        <IonButton size="small" onClick={logNext} style={{ flexShrink: 0 }}>
          <IonIcon slot="start" icon={playOutline} />
          Log
        </IonButton>
      </div>

      {logModalOpen && (
        <LogProgressModal
          show={show}
          rewatchId={rewatchId}
          onClose={() => setLogModalOpen(false)}
        />
      )}
    </>
  )
}
