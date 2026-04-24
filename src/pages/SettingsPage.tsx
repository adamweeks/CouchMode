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
  IonNote,
} from '@ionic/react'
import { AppTabBar } from '../components/AppTabBar'
import { useAuth } from '../contexts/AuthContext'

export function SettingsPage() {
  const { user, signOut } = useAuth()

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'User'
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const version = '1.0.0'

  return (
    <IonPage>
      <IonHeader className="gradient-header">
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {/* Profile card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: 'var(--ion-item-background)',
            margin: '16px',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3880ff 0%, #5260ff 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '22px',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p style={{ fontWeight: 600, fontSize: '16px', margin: 0 }}>{displayName}</p>
            {user?.email && (
              <p style={{ fontSize: '13px', color: 'var(--ion-color-medium)', margin: '2px 0 0' }}>
                {user.email}
              </p>
            )}
          </div>
        </div>

        {/* About section */}
        <IonList inset>
          <IonItem>
            <IonLabel>Version</IonLabel>
            <IonNote slot="end">{version}</IonNote>
          </IonItem>
          <IonItem lines="none">
            <IonLabel>Privacy Policy</IonLabel>
          </IonItem>
        </IonList>

        {/* Sign out */}
        <div style={{ padding: '8px 16px 32px' }}>
          <IonButton
            expand="block"
            fill="outline"
            color="danger"
            onClick={() => signOut()}
          >
            Sign Out
          </IonButton>
        </div>
      </IonContent>

      <IonFooter>
        <AppTabBar />
      </IonFooter>
    </IonPage>
  )
}
