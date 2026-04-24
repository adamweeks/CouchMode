import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  IonPage,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  useIonToast,
} from '@ionic/react'
import { useAuth } from '../contexts/AuthContext'
import { getErrorMessage } from '../lib/progressLogic'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'signin' | 'signup'>('signin')
  const [presentToast] = useIonToast()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    try {
      if (tab === 'signin') {
        await signIn(data.email, data.password)
      } else {
        await signUp(data.email, data.password)
      }
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
      <IonContent className="ion-padding">
        <div className="flex flex-col items-center justify-center min-h-full gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Couchmode</h1>
            <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.875rem' }}>
              Your TV rewatch tracker
            </p>
          </div>

          <IonSegment
            value={tab}
            onIonChange={e => setTab(e.detail.value as 'signin' | 'signup')}
            style={{ width: '100%', maxWidth: '384px' }}
          >
            <IonSegmentButton value="signin">
              <IonLabel>Sign In</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="signup">
              <IonLabel>Sign Up</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            style={{ width: '100%', maxWidth: '384px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <div>
              <IonInput
                {...register('email')}
                type="email"
                placeholder="Email"
                autocomplete="email"
                aria-label="Email address"
                aria-invalid={!!errors.email}
                fill="outline"
              />
              {errors.email && (
                <IonText color="danger">
                  <p role="alert" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    {errors.email.message}
                  </p>
                </IonText>
              )}
            </div>

            <div>
              <IonInput
                {...register('password')}
                type="password"
                placeholder="Password"
                autocomplete={tab === 'signup' ? 'new-password' : 'current-password'}
                aria-label="Password"
                aria-invalid={!!errors.password}
                fill="outline"
              />
              {errors.password && (
                <IonText color="danger">
                  <p role="alert" style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                    {errors.password.message}
                  </p>
                </IonText>
              )}
            </div>

            <IonButton expand="block" type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? (tab === 'signin' ? 'Signing In…' : 'Creating Account…')
                : (tab === 'signin' ? 'Sign In' : 'Create Account')}
            </IonButton>
          </form>

          <div
            style={{
              width: '100%',
              maxWidth: '384px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ flex: 1, height: '1px', background: 'var(--ion-item-border-color)' }} />
            <IonText style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>or</IonText>
            <div style={{ flex: 1, height: '1px', background: 'var(--ion-item-border-color)' }} />
          </div>

          <IonButton
            expand="block"
            fill="outline"
            style={{ width: '100%', maxWidth: '384px' }}
            onClick={async () => {
              try {
                await signInWithGoogle()
              } catch (e) {
                presentToast({
                  message: getErrorMessage(e),
                  duration: 3000,
                  color: 'danger',
                  position: 'top',
                })
              }
            }}
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
