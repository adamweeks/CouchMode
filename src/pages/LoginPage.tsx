import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IonPage, IonContent, IonButton, IonInput, IonItem, IonLabel, useIonToast } from '@ionic/react'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/progressLogic'

export function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [presentToast] = useIonToast()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password)
        presentToast({
          message: 'Account created! Check your email to confirm.',
          duration: 4000,
          color: 'success',
          position: 'top',
        })
      } else {
        await signIn(email, password)
        navigate('/', { replace: true })
      }
    } catch (e) {
      presentToast({
        message: getErrorMessage(e),
        duration: 3000,
        color: 'danger',
        position: 'top',
      })
    } finally {
      setSubmitting(false)
    }
  }

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
          }}
        >
          {/* Logo mark */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginBottom: '20px', borderRadius: '18px', filter: 'drop-shadow(0 8px 24px rgba(13,148,136,0.4))' }}
          >
            <defs>
              <linearGradient id="lp-tv-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#071f20"/>
                <stop offset="100%" stopColor="#040e10"/>
              </linearGradient>
              <linearGradient id="lp-screen" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#071e20"/>
                <stop offset="100%" stopColor="#030c0e"/>
              </linearGradient>
              <filter id="lp-glow">
                <feGaussianBlur stdDeviation="8" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <rect width="512" height="512" rx="115" fill="url(#lp-tv-bg)"/>
            <rect x="72" y="130" width="368" height="250" rx="28" fill="#0a2426"/>
            <rect x="72" y="130" width="368" height="250" rx="28" fill="none" stroke="#0d3a3e" strokeWidth="3"/>
            <rect x="96" y="154" width="320" height="202" rx="14" fill="url(#lp-screen)"/>
            <rect x="96" y="154" width="320" height="202" rx="14" fill="none" stroke="#0d9488" strokeWidth="1.5" opacity="0.7"/>
            <rect x="214" y="378" width="84" height="20" rx="6" fill="#0a2426"/>
            <rect x="180" y="395" width="152" height="16" rx="8" fill="#0a2426"/>
            <circle cx="256" cy="255" r="68" fill="none" stroke="#0d9488" strokeWidth="12" opacity="0.3"/>
            <path d="M 256 187 A 68 68 0 1 1 200 290" fill="none" stroke="#2dd4bf" strokeWidth="12" strokeLinecap="round" filter="url(#lp-glow)"/>
            <polygon points="190,278 198,300 215,285" fill="#2dd4bf" filter="url(#lp-glow)"/>
            <polygon points="240,234 240,276 278,255" fill="#5eead4" opacity="0.9" filter="url(#lp-glow)"/>
            <ellipse cx="256" cy="410" rx="140" ry="16" fill="#0d9488" opacity="0.15"/>
          </svg>

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
              marginBottom: '32px',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            Settle in. Track every show.
          </p>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '320px' }}>
            <IonItem style={{ marginBottom: '8px' }}>
              <IonLabel position="floating">Email</IonLabel>
              <IonInput
                type="email"
                value={email}
                onIonInput={e => setEmail(e.detail.value ?? '')}
                required
                autocomplete="email"
              />
            </IonItem>
            <IonItem style={{ marginBottom: '16px' }}>
              <IonLabel position="floating">Password</IonLabel>
              <IonInput
                type="password"
                value={password}
                onIonInput={e => setPassword(e.detail.value ?? '')}
                required
                autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
            </IonItem>

            <IonButton
              expand="block"
              type="submit"
              disabled={submitting}
              style={{ marginBottom: '12px' }}
            >
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </IonButton>
          </form>

          {/* Toggle sign in / sign up */}
          <p style={{ fontSize: '14px', color: 'var(--ion-color-medium)', margin: '0 0 24px' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ion-color-primary)',
                cursor: 'pointer',
                padding: 0,
                fontSize: 'inherit',
                textDecoration: 'underline',
              }}
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              maxWidth: '320px',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--ion-color-light-shade)' }} />
            <span style={{ fontSize: '13px', color: 'var(--ion-color-medium)' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--ion-color-light-shade)' }} />
          </div>

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

          <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', marginTop: '32px', opacity: 0.6 }}>
            v{__APP_VERSION__}
          </p>
        </div>
      </IonContent>
    </IonPage>
  )
}
