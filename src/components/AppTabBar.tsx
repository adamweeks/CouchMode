import { IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/react'
import { tvOutline, bookOutline, settingsOutline } from 'ionicons/icons'
import { useNavigate, useLocation } from 'react-router-dom'

export function AppTabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <IonTabBar>
      <IonTabButton
        tab="rotation"
        selected={pathname === '/'}
        onClick={() => navigate('/')}
      >
        <IonIcon icon={tvOutline} />
        <IonLabel>My Shows</IonLabel>
      </IonTabButton>
      <IonTabButton
        tab="history"
        selected={pathname === '/history'}
        onClick={() => navigate('/history')}
      >
        <IonIcon icon={bookOutline} />
        <IonLabel>History</IonLabel>
      </IonTabButton>
      <IonTabButton
        tab="settings"
        selected={pathname === '/settings'}
        onClick={() => navigate('/settings')}
      >
        <IonIcon icon={settingsOutline} />
        <IonLabel>Settings</IonLabel>
      </IonTabButton>
    </IonTabBar>
  )
}
