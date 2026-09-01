import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../hooks/useIsAdmin', () => ({
  useIsAdmin: vi.fn(() => ({ data: false, isPending: false })),
}))

vi.mock('../hooks/useResumeShow', () => ({
  useResumeShow: vi.fn(() => ({ data: null })),
}))
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '../test/utils'
import { ThemeProvider, THEME_STORAGE_KEY } from '../contexts/ThemeContext'
import {
  PreferencesProvider,
  PREFERENCES_STORAGE_KEY,
} from '../contexts/PreferencesContext'
import { SettingsPage } from './SettingsPage'

const mockSignOut = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

// The preferences provider loads/saves through Supabase; stub it so tests stay
// offline. Preference state is still exercised via localStorage + optimistic UI.
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      upsert: () => Promise.resolve({ data: null, error: null }),
    }),
  },
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
        <PreferencesProvider>
          <MemoryRouter>
            <SettingsPage />
          </MemoryRouter>
        </PreferencesProvider>
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
      expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveValue('system')
    })

    it('switches to dark mode and persists the choice', () => {
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      fireEvent.change(screen.getByRole('combobox', { name: 'Theme' }), { target: { value: 'dark' } })
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    })

    it('switches back to light mode', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveValue('dark')

      fireEvent.change(screen.getByRole('combobox', { name: 'Theme' }), { target: { value: 'light' } })
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    })
  })

  describe('home screen options', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('defaults the Continue Watching card on and set to "Up next"', () => {
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      expect(screen.getByRole('checkbox', { name: 'Continue Watching card' })).toBeChecked()
      expect(screen.getByRole('combobox', { name: 'Continue Watching card shows' })).toHaveValue('up-next')
      expect(screen.getByRole('checkbox', { name: 'Show finished shows' })).toBeChecked()
    })

    it('switches the Continue Watching card to "Last watched" and persists it', () => {
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      fireEvent.change(screen.getByRole('combobox', { name: 'Continue Watching card shows' }), {
        target: { value: 'last-watched' },
      })
      expect(screen.getByRole('combobox', { name: 'Continue Watching card shows' })).toHaveValue('last-watched')
      expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toMatchObject({
        resumeCardMode: 'last-watched',
      })
    })

    it('toggles the Continue Watching card off and persists it', () => {
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      fireEvent.click(screen.getByRole('checkbox', { name: 'Continue Watching card' }))
      expect(screen.getByRole('checkbox', { name: 'Continue Watching card' })).not.toBeChecked()
      expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toMatchObject({
        showResumeCard: false,
      })
    })

    it('toggles the finished-shows section off and persists it', () => {
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      fireEvent.click(screen.getByRole('checkbox', { name: 'Show finished shows' }))
      expect(screen.getByRole('checkbox', { name: 'Show finished shows' })).not.toBeChecked()
      expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toMatchObject({
        showDoneSection: false,
      })
    })

    it('renders a preview of both resume-card modes', () => {
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      expect(screen.getByRole('button', { name: 'Preview: Up next' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Preview: Last watched' })).toBeInTheDocument()
    })

    it('selecting a preview sets and persists that mode', () => {
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      fireEvent.click(screen.getByRole('button', { name: 'Preview: Last watched' }))
      expect(screen.getByRole('combobox', { name: 'Continue Watching card shows' })).toHaveValue('last-watched')
      expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toMatchObject({
        resumeCardMode: 'last-watched',
      })
    })

    it('hides the preview when the Continue Watching card is off', () => {
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      fireEvent.click(screen.getByRole('checkbox', { name: 'Continue Watching card' }))
      expect(screen.queryByRole('button', { name: 'Preview: Up next' })).not.toBeInTheDocument()
    })

    it('restores stored preferences on load', () => {
      localStorage.setItem(
        PREFERENCES_STORAGE_KEY,
        JSON.stringify({ showResumeCard: false, resumeCardMode: 'last-watched', showDoneSection: false }),
      )
      renderPage({ id: 'u1', email: 'a@b.com', user_metadata: {} })
      expect(screen.getByRole('checkbox', { name: 'Continue Watching card' })).not.toBeChecked()
      expect(screen.getByRole('combobox', { name: 'Continue Watching card shows' })).toHaveValue('last-watched')
      expect(screen.getByRole('checkbox', { name: 'Show finished shows' })).not.toBeChecked()
    })
  })
})
