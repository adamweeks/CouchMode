import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../contexts/AuthContext'

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderWithRouter(
  auth: { user: unknown; loading: boolean },
  initialPath = '/protected',
) {
  vi.mocked(useAuth).mockReturnValue(auth as ReturnType<typeof useAuth>)
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div data-testid="children">Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('shows a spinner when loading', () => {
    renderWithRouter({ user: null, loading: true })
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('does not render children when loading', () => {
    renderWithRouter({ user: null, loading: true })
    expect(screen.queryByTestId('children')).not.toBeInTheDocument()
  })

  it('redirects to /login when user is null and not loading', () => {
    renderWithRouter({ user: null, loading: false })
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })

  it('renders children when user is authenticated', () => {
    renderWithRouter({ user: { id: 'u1' }, loading: false })
    expect(screen.getByTestId('children')).toBeInTheDocument()
  })

  it('does not redirect when user is authenticated', () => {
    renderWithRouter({ user: { id: 'u1' }, loading: false })
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
  })
})
