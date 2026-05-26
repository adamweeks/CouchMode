import { useState } from 'react'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonInput,
  IonTextarea,
  IonText,
  useIonToast,
} from '@ionic/react'
import { useMarkSeriesFinished } from '../hooks/useRewatches'
import { getErrorMessage } from '../lib/progressLogic'
import { ServiceSelector } from './ServiceSelector'

interface Props {
  showId: string
  rewatchId: string
  rewatchStartedAt: string
  currentService: string | null
  onClose: () => void
  availableOn?: string[]
}

export function MarkFinishedModal({ showId, rewatchId, rewatchStartedAt, currentService, onClose, availableOn }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [startDate, setStartDate] = useState(rewatchStartedAt.split('T')[0])
  const [endDate, setEndDate] = useState(today)
  const [note, setNote] = useState('')
  const [service, setService] = useState(currentService ?? '')
  const [error, setError] = useState<string | null>(null)
  const [presentToast] = useIonToast()

  const markFinished = useMarkSeriesFinished()

  async function handleSubmit() {
    setError(null)
    if (startDate && endDate && startDate > endDate) {
      setError('Start date must be before finish date')
      return
    }
    try {
      const completedAt = new Date(endDate + 'T12:00:00Z').toISOString()
      const startedAt = startDate ? new Date(startDate + 'T12:00:00Z').toISOString() : undefined
      await markFinished.mutateAsync({
        rewatchId,
        showId,
        startedAt,
        completedAt,
        note: note || undefined,
        service: service || undefined,
      })
      onClose()
    } catch (e) {
      presentToast({
        message: getErrorMessage(e),
        duration: 3000,
        color: 'danger',
        position: 'top',
      })
    }
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
          <IonTitle>Finished it!</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <IonInput
            type="date"
            value={startDate}
            max={endDate || today}
            onIonInput={e => setStartDate(e.detail.value ?? '')}
            label="When did you start? (optional)"
            labelPlacement="floating"
            fill="outline"
          />

          <IonInput
            type="date"
            value={endDate}
            max={today}
            onIonInput={e => setEndDate(e.detail.value ?? '')}
            label="When did you finish?"
            labelPlacement="floating"
            fill="outline"
          />

          <ServiceSelector
            value={service}
            onChange={setService}
            label="Watched on (optional)"
            availableOn={availableOn}
          />

          <IonTextarea
            value={note}
            onIonInput={e => setNote(e.detail.value ?? '')}
            placeholder="Any thoughts on this rewatch?"
            rows={2}
            label="Note (optional)"
            labelPlacement="floating"
            fill="outline"
          />

          {error && (
            <IonText color="danger">
              <p style={{ fontSize: '0.875rem' }}>{error}</p>
            </IonText>
          )}

          <IonButton
            expand="block"
            color="success"
            disabled={markFinished.isPending || !endDate}
            onClick={handleSubmit}
          >
            {markFinished.isPending ? 'Saving...' : 'Mark as Finished'}
          </IonButton>

          <IonButton expand="block" fill="outline" onClick={onClose}>
            Cancel
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  )
}
