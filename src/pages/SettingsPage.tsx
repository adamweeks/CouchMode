import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
} from '@ionic/react'
import { AppTabBar } from '../components/AppTabBar'
import { useAuth } from '../contexts/AuthContext'

export function SettingsPage() {
  const { signOut } = useAuth()

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonList inset>
          <IonItem>
            <IonLabel>
              <h2>Account</h2>
            </IonLabel>
          </IonItem>
          <IonItem lines="none">
            <IonButton
              expand="block"
              fill="outline"
              color="danger"
              style={{ width: '100%' }}
              onClick={() => signOut()}
            >
              Sign Out
            </IonButton>
          </IonItem>
        </IonList>
      </IonContent>
      <IonFooter>
        <AppTabBar />
      </IonFooter>
    </IonPage>
  )
}
