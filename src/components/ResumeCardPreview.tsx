import { IonIcon } from '@ionic/react'
import { playOutline, playSkipForwardOutline, timeOutline } from 'ionicons/icons'
import { StatusLine } from './StatusLine'
import { formatProgress } from '../lib/progressLogic'
import type { ResumeCardMode } from '../contexts/PreferencesContext'

export interface ResumeCardPreviewData {
  title: string
  posterUrl: string | null
  /** The most recently logged episode. */
  lastWatched: { season: number; episode: number }
  /** The next episode to watch. */
  upNext: { season: number; episode: number }
}

/**
 * A compact, non-navigating replica of the "Continue Watching" card as it would
 * appear on the home screen in a given mode. Used in Settings so the user can
 * see the difference between the two `resumeCardMode` options before choosing.
 * Tapping it selects that mode.
 */
export function ResumeCardPreview({
  mode,
  data,
  selected,
  onSelect,
}: {
  mode: ResumeCardMode
  data: ResumeCardPreviewData
  selected: boolean
  onSelect: () => void
}) {
  const lastWatched = mode === 'last-watched'
  const pos = lastWatched ? data.lastWatched : data.upNext

  return (
    <div
      role="button"
      aria-pressed={selected}
      aria-label={`Preview: ${lastWatched ? 'Last watched' : 'Up next'}`}
      onClick={onSelect}
      style={{
        background:
          'linear-gradient(135deg, rgba(var(--ion-color-primary-rgb), 0.12) 0%, rgba(var(--ion-color-primary-rgb), 0.04) 100%)',
        border: selected
          ? '1.5px solid rgba(var(--ion-color-primary-rgb), 0.7)'
          : '1px solid rgba(var(--ion-color-primary-rgb), 0.18)',
        opacity: selected ? 1 : 0.6,
        borderRadius: '10px',
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        transition: 'opacity 0.15s ease, border-color 0.15s ease',
      }}
    >
      <img
        src={data.posterUrl ?? '/placeholder-poster.svg'}
        alt=""
        aria-hidden
        style={{
          width: '34px',
          height: '46px',
          objectFit: 'cover',
          borderRadius: '5px',
          flexShrink: 0,
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '9px',
            color: 'var(--ion-color-primary)',
            fontWeight: 700,
            margin: '0 0 2px',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
          }}
        >
          Continue Watching
        </p>
        <h3
          style={{
            fontWeight: 700,
            fontSize: '13px',
            margin: '0 0 2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {data.title}
        </h3>
        <StatusLine
          icon={lastWatched ? timeOutline : playSkipForwardOutline}
          label={lastWatched ? 'Last watched' : 'Up next'}
          detail={formatProgress(pos.season, pos.episode)}
        />
      </div>

      {/* Static visual of the Log button — part of "what the card looks like". */}
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          flexShrink: 0,
          fontSize: '12px',
          fontWeight: 600,
          color: '#fff',
          background: 'var(--ion-color-primary)',
          borderRadius: '8px',
          padding: '5px 10px',
        }}
      >
        <IonIcon icon={playOutline} style={{ fontSize: '13px' }} />
        Log
      </span>
    </div>
  )
}
