import { useState } from 'react'
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  useIonToast,
} from '@ionic/react'
import { ServiceSelector } from './ServiceSelector'
import { useUpdateRewatch } from '../hooks/useRewatches'
import { getErrorMessage } from '../lib/progressLogic'

interface Props {
  showId: string
  rewatchId: string
  currentService: string | null
  onClose: () => void
  availableOn?: string[]
}

export function EditServiceModal({ showId, rewatchId, currentService, onClose, availableOn }: Props) {
  const [service, setService] = useState(currentService ?? '')
  const [presentToast] = useIonToast()
  const updateRewatch = useUpdateRewatch(showId)

  async function handleSave() {
    try {
      await updateRewatch.mutateAsync({ rewatchId, service: service || null })
      onClose()
    } catch (e) {
      presentToast({ message: getErrorMessage(e), duration: 3000, color: 'danger', position: 'top' })
    }
  }

  return (
    <IonModal
      isOpen={true}
      onDidDismiss={onClose}
      initialBreakpoint={0.5}
      breakpoints={[0, 0.5]}
      handle={true}
    >
      <IonHeader>
        <IonToolbar>
          <IonTitle>Watching on</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Cancel</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ServiceSelector value={service} onChange={setService} label="Service" availableOn={availableOn} />

          <IonButton
            expand="block"
            disabled={updateRewatch.isPending}
            onClick={handleSave}
          >
            {updateRewatch.isPending ? 'Saving…' : 'Save'}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  )
}
