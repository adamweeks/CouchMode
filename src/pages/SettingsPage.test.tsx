import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../hooks/useIsAdmin', () => ({
  useIsAdmin: vi.fn(() => ({ data: false, isPending: false })),
}))
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '../test/utils'
import { ThemeProvider, THEME_STORAGE_KEY } from '../contexts/ThemeContext'
import { SettingsPage } from './SettingsPage'

const mockSignOut = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) }
})

import { useAuth } from '../contexts/AuthContext'

function renderPage(user: Record<string, unknown> | null = null) {
  vi.mocked(useAuth).mockReturnValue({
    user,
    signOut: mockSignOut,
  } as unknown as ReturnType<typeof useAuth>)

  return render(
    <QueryClientProvider client={createQueryClient()}>
      <ThemeProvider>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignOut.mockResolvedValue(undefined)
  })

  it('renders the Settings title heading', () => {
    renderPage({ id: 'u1', email: 'test@example.com', user_metadata: {} })
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('displays the user email when no display name', () => {
    renderPage({ id: 'u1', email: 'test@example.com', user_metadata: {} })
    // Email appears as the display name — at least one element should show it
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThan(0)
  })

  it('displays the full name when available', () => {
    renderPage({ id: 'u1', email: 'a@b.com', user_metadata: { full_name: 'Jane Doe' } })
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('renders the Sign Out button', () => {
    renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
    expect(screen.getByText('Sign Out')).toBeInTheDocument()
  })

  it('calls signOut when Sign Out is clicked', () => {
    renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
    fireEvent.click(screen.getByText('Sign Out'))
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('renders version info', () => {
    renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
    expect(screen.getByText('Version')).toBeInTheDocument()
  })

  describe('theme selector', () => {
    beforeEach(() => {
      localStorage.clear()
      document.documentElement.classList.remove('dark')
    })

    it('renders with System selected by default', () => {
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      expect(screen.getByText('Theme')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toHaveValue('system')
    })

    it('switches to dark mode and persists the choice', () => {
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'dark' } })
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    })

    it('switches back to light mode', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      expect(screen.getByRole('combobox')).toHaveValue('dark')

      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'light' } })
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    })
  })
})
