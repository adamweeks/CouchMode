import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

const mockSignInWithGoogle = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    signInWithGoogle: mockSignInWithGoogle,
  })),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignInWithGoogle.mockResolvedValue(undefined)
  })

  it('renders the app name', () => {
    renderPage()
    expect(screen.getByText('Couchmode')).toBeInTheDocument()
  })

  it('renders the tagline', () => {
    renderPage()
    expect(screen.getByText(/Settle in/i)).toBeInTheDocument()
  })

  it('renders the Google sign-in button', () => {
    renderPage()
    expect(screen.getByText(/Continue with Google/i)).toBeInTheDocument()
  })

  it('calls signInWithGoogle when the button is clicked', async () => {
    renderPage()
    fireEvent.click(screen.getByText(/Continue with Google/i))
    await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalledOnce())
  })

  it('navigates to / after successful sign-in', async () => {
    renderPage()
    fireEvent.click(screen.getByText(/Continue with Google/i))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true }))
  })

  it('does not crash when signInWithGoogle throws', async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error('OAuth error'))
    renderPage()
    fireEvent.click(screen.getByText(/Continue with Google/i))
    await waitFor(() => expect(mockSignInWithGoogle).toHaveBeenCalled())
    // Page should still be rendered (no unhandled crash)
    expect(screen.getByText('Couchmode')).toBeInTheDocument()
  })
})
