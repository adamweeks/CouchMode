import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
} from '@ionic/react'
import { AppTabBar } from '../components/AppTabBar'

export function HistoryPage() {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>History</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div
          className="flex flex-col items-center justify-center pt-20 text-center px-8 gap-2"
          style={{ color: 'var(--ion-color-medium)' }}
        >
          <p>Rewatch history coming soon.</p>
        </div>
      </IonContent>
      <IonFooter>
        <AppTabBar />
      </IonFooter>
    </IonPage>
  )
}
