import { useRegisterSW } from 'virtual:pwa-register/react'
import { IonToast } from '@ionic/react'

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  return (
    <IonToast
      isOpen={needRefresh}
      message="A new version of CouchMode is available."
      position="top"
      buttons={[
        {
          text: 'Dismiss',
          role: 'cancel',
          handler: () => setNeedRefresh(false),
        },
        {
          text: 'Update',
          handler: () => updateServiceWorker(true),
        },
      ]}
      onDidDismiss={() => setNeedRefresh(false)}
    />
  )
}
