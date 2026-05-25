import { IonIcon } from '@ionic/react'
import { tvOutline, bookOutline, settingsOutline, sparklesOutline } from 'ionicons/icons'
import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { path: '/', label: 'My Shows', icon: tvOutline },
  { path: '/suggestions', label: 'Suggested', icon: sparklesOutline },
  { path: '/history', label: 'History', icon: bookOutline },
  { path: '/settings', label: 'Settings', icon: settingsOutline },
]

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        background: 'var(--ion-tab-bar-background, #ffffff)',
        borderTop: '0.55px solid var(--ion-tab-bar-border-color, rgba(0,0,0,0.08))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 100,
      }}
    >
      {TABS.map(({ path, label, icon }) => {
        const selected = pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 50,
              gap: 2,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: selected
                ? 'var(--ion-tab-bar-color-selected, #3880ff)'
                : 'var(--ion-tab-bar-color, #92949c)',
              WebkitTapHighlightColor: 'transparent',
              padding: 0,
            }}
          >
            <IonIcon icon={icon} style={{ fontSize: 24 }} />
            <span style={{ fontSize: 10, letterSpacing: -0.1 }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
