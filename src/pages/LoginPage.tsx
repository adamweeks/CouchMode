import { useNavigate } from 'react-router-dom'
import { IonPage, IonContent, IonButton, useIonToast } from '@ionic/react'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/progressLogic'

export function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [presentToast] = useIonToast()

  async function handleGoogle() {
    try {
      await signInWithGoogle()
      navigate('/', { replace: true })
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
    <IonPage>
      <IonContent>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100%',
            padding: '48px 32px',
            gap: '0',
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #3880ff 0%, #5260ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(56, 128, 255, 0.35)',
            }}
          >
            📺
          </div>

          {/* Wordmark */}
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              margin: '0 0 8px',
              color: 'var(--ion-text-color)',
            }}
          >
            Couchmode
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--ion-color-medium)',
              marginBottom: '48px',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            Track every rewatch of your favorite shows
          </p>

          {/* Google sign-in */}
          <IonButton
            expand="block"
            fill="outline"
            style={{ width: '100%', maxWidth: '320px' }}
            onClick={handleGoogle}
          >
            <svg
              slot="start"
              style={{ width: '20px', height: '20px' }}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  )
}
