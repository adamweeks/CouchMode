import { useState } from 'react'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonTextarea,
  IonText,
  useIonAlert,
} from '@ionic/react'
import { EpisodePicker } from './EpisodePicker'
import { useProgressLogs, useLogProgress } from '../hooks/useProgressLogs'
import { useTMDBSeason, getEpisodeDetails } from '../hooks/useTMDBSeason'
import { getCurrentProgress, isRegression, formatProgress, getErrorMessage } from '../lib/progressLogic'

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

  const [value, setValue] = useState({
    season: currentProgress?.season ?? 1,
    episode: currentProgress?.episode ?? 1,
  })
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [presentAlert] = useIonAlert()

  const logProgress = useLogProgress()

  const { data: seasonData, isLoading: isLoadingSeason } = useTMDBSeason(show.tmdb_id, value.season)
  const episodeDetails = getEpisodeDetails(seasonData?.episodes, value.episode)

  async function submitLog() {
    setIsSubmitting(true)
    setError(null)
    try {
      await logProgress.mutateAsync({
        rewatchId,
        showId: show.id,
        season: value.season,
        episode: value.episode,
        note: note || undefined,
        totalSeasons: show.total_seasons,
        episodesPerSeason: show.episodes_per_season,
      })
      onClose()
    } catch (e) {
      setError(getErrorMessage(e))
      setIsSubmitting(false)
    }
  }

  function handlePickerSubmit() {
    if (isRegression(value.season, value.episode, currentProgress)) {
      presentAlert({
        header: 'Going back?',
        message: `This is earlier than your current progress${
          currentProgress
            ? ` (${formatProgress(currentProgress.season, currentProgress.episode)})`
            : ''
        }. What's happening?`,
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          { text: 'I started over', handler: () => submitLog() },
        ],
      })
      return
    }
    submitLog()
  }

  return (
    <IonModal
      isOpen={true}
      onDidDismiss={onClose}
      initialBreakpoint={0.85}
      breakpoints={[0, 0.85, 1]}
      handle={true}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>{show.title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <p
          className="text-sm text-center"
          style={{ color: 'var(--ion-color-medium)', marginBottom: '16px' }}
        >
          Log where you are right now
        </p>

        <EpisodePicker
          totalSeasons={show.total_seasons}
          episodesPerSeason={show.episodes_per_season}
          value={value}
          onChange={setValue}
          episodeName={episodeDetails?.name}
          episodeStillPath={episodeDetails?.still_path}
          isLoadingEpisode={isLoadingSeason}
        />

        <IonTextarea
          value={note}
          onIonInput={e => setNote(e.detail.value ?? '')}
          placeholder="e.g. started during holiday break"
          rows={2}
          label="Note (optional)"
          labelPlacement="floating"
          fill="outline"
          style={{ marginTop: '16px' }}
        />

        {error && (
          <IonText color="danger">
            <p role="alert" className="text-sm text-center" style={{ marginTop: '8px' }}>
              {error}
            </p>
          </IonText>
        )}

        <IonButton
          expand="block"
          disabled={isSubmitting}
          onClick={handlePickerSubmit}
          style={{ marginTop: '16px' }}
        >
          {isSubmitting ? 'Saving…' : `Log ${formatProgress(value.season, value.episode)}`}
        </IonButton>
      </IonContent>
    </IonModal>
  )
}
