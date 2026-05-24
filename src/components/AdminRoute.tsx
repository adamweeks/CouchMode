import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ADMIN_EMAILS = ['adam.weeks@gmail.com']

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
