import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonNote,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonListHeader,
  IonToggle,
} from '@ionic/react'
import {
  moonOutline,
  shieldCheckmarkOutline,
  playCircleOutline,
  checkmarkDoneOutline,
} from 'ionicons/icons'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import type { ThemePreference } from '../contexts/ThemeContext'
import { usePreferences } from '../contexts/PreferencesContext'
import type { ResumeCardMode } from '../contexts/PreferencesContext'
import { useIsAdmin } from '../hooks/useIsAdmin'

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { data: isAdmin } = useIsAdmin()
  const { preference, setPreference } = useTheme()
  const { preferences, setPreference: setAppPreference } = usePreferences()

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'User'
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const version = __APP_VERSION__

  return (
    <IonPage>
      <IonHeader className="gradient-header">
        <IonToolbar>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="tab-page-content">
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
            boxShadow: 'var(--app-card-shadow)',
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

        {/* Appearance section */}
        <IonList inset>
          <IonItem lines="none">
            <IonIcon icon={moonOutline} slot="start" color="primary" />
            <IonLabel>Theme</IonLabel>
            <IonSelect
              slot="end"
              interface="popover"
              aria-label="Theme"
              value={preference}
              onIonChange={(e) => setPreference(e.detail.value as ThemePreference)}
            >
              <IonSelectOption value="system">System</IonSelectOption>
              <IonSelectOption value="light">Light</IonSelectOption>
              <IonSelectOption value="dark">Dark</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonList>

        {/* Home screen section */}
        <IonList inset>
          <IonListHeader>
            <IonLabel>Home Screen</IonLabel>
          </IonListHeader>
          <IonItem>
            <IonIcon icon={playCircleOutline} slot="start" color="primary" />
            <IonLabel>Continue Watching card</IonLabel>
            <IonToggle
              slot="end"
              aria-label="Continue Watching card"
              checked={preferences.showResumeCard}
              onIonChange={(e) => setAppPreference('showResumeCard', e.detail.checked)}
            />
          </IonItem>
          <IonItem>
            <IonLabel>
              <p style={{ margin: 0 }}>That card shows</p>
              <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: '2px 0 0' }}>
                Highlight the next episode or the last one you watched
              </p>
            </IonLabel>
            <IonSelect
              slot="end"
              interface="popover"
              aria-label="Continue Watching card shows"
              disabled={!preferences.showResumeCard}
              value={preferences.resumeCardMode}
              onIonChange={(e) => setAppPreference('resumeCardMode', e.detail.value as ResumeCardMode)}
            >
              <IonSelectOption value="up-next">Up next</IonSelectOption>
              <IonSelectOption value="last-watched">Last watched</IonSelectOption>
            </IonSelect>
          </IonItem>
          <IonItem lines="none">
            <IonIcon icon={checkmarkDoneOutline} slot="start" color="primary" />
            <IonLabel>Show finished shows</IonLabel>
            <IonToggle
              slot="end"
              aria-label="Show finished shows"
              checked={preferences.showDoneSection}
              onIonChange={(e) => setAppPreference('showDoneSection', e.detail.checked)}
            />
          </IonItem>
        </IonList>

        {/* Admin section */}
        {isAdmin && (
          <IonList inset>
            <IonItem button detail onClick={() => navigate('/admin')} lines="none">
              <IonIcon icon={shieldCheckmarkOutline} slot="start" color="primary" />
              <IonLabel>Admin Portal</IonLabel>
            </IonItem>
          </IonList>
        )}

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

        {/* TMDB attribution */}
        <IonList inset>
          <IonItem lines="none">
            <div style={{ width: '100%', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <img
                src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
                alt="The Movie Database"
                style={{ height: '20px', width: 'auto' }}
              />
              <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: 0, lineHeight: '1.5' }}>
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </p>
            </div>
          </IonItem>
        </IonList>

        {/* Sign out */}
        <div style={{ padding: '8px 16px 32px' }}>
          <IonButton
            expand="block"
            fill="outline"
            color="danger"
            onClick={signOut}
          >
            Sign Out
          </IonButton>
        </div>
      </IonContent>

      <BottomNav />
    </IonPage>
  )
}
