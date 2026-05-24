import { Navigate } from 'react-router-dom'
import { IonSpinner } from '@ionic/react'
import { useAuth } from '../contexts/AuthContext'
import { useIsAdmin } from '../hooks/useIsAdmin'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin()

  if (authLoading || adminLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
        <IonSpinner name="crescent" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
