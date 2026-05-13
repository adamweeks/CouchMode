import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IonButton, IonIcon } from '@ionic/react'
import { playOutline } from 'ionicons/icons'
import { useLogEpisodeSheet } from '../hooks/useLogEpisodeSheet'
import { formatProgress } from '../lib/progressLogic'
import { LogProgressModal } from './LogProgressModal'
import type { ResumeShowData } from '../hooks/useResumeShow'

export function ResumeCard({ data }: { data: ResumeShowData }) {
  const navigate = useNavigate()
  const [logModalOpen, setLogModalOpen] = useState(false)
  const { show, rewatchId, currentProgress } = data

  const { logNext, nextEp } = useLogEpisodeSheet(
    show,
    rewatchId,
    currentProgress,
    () => setLogModalOpen(true),
  )

  if (!nextEp || !logNext) return null

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
          <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
            Up next: {formatProgress(nextEp.season, nextEp.episode)}
          </p>
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
