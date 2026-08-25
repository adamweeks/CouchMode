import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Controllable Supabase mock: one row store behind select().eq().maybeSingle()
// and an upsert spy.
const maybeSingle = vi.fn()
const upsert = vi.fn(() => Promise.resolve({ data: null, error: null }))
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      upsert,
    }),
  },
}))

let mockUser: { id: string } | null = null
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

import {
  PreferencesProvider,
  usePreferences,
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
} from './PreferencesContext'

function Probe() {
  const { preferences, setPreference } = usePreferences()
  return (
    <div>
      <span data-testid="mode">{preferences.resumeCardMode}</span>
      <span data-testid="resume">{String(preferences.showResumeCard)}</span>
      <span data-testid="done">{String(preferences.showDoneSection)}</span>
      <button onClick={() => setPreference('resumeCardMode', 'last-watched')}>set-mode</button>
      <button onClick={() => setPreference('showResumeCard', false)}>hide-resume</button>
    </div>
  )
}

function renderProbe() {
  return render(
    <PreferencesProvider>
      <Probe />
    </PreferencesProvider>,
  )
}

describe('PreferencesContext', () => {
  beforeEach(() => {
    localStorage.clear()
    mockUser = null
    maybeSingle.mockReset()
    maybeSingle.mockResolvedValue({ data: null, error: null })
    upsert.mockClear()
  })

  it('provides defaults when nothing is stored', () => {
    renderProbe()
    expect(screen.getByTestId('mode')).toHaveTextContent('up-next')
    expect(screen.getByTestId('resume')).toHaveTextContent('true')
    expect(screen.getByTestId('done')).toHaveTextContent('true')
  })

  it('updates state and caches to localStorage (signed out — no server write)', () => {
    renderProbe()
    fireEvent.click(screen.getByText('set-mode'))
    expect(screen.getByTestId('mode')).toHaveTextContent('last-watched')
    expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toMatchObject({
      resumeCardMode: 'last-watched',
    })
    expect(upsert).not.toHaveBeenCalled()
  })

  it('hydrates from the local cache immediately', () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ resumeCardMode: 'last-watched', showDoneSection: false }),
    )
    renderProbe()
    expect(screen.getByTestId('mode')).toHaveTextContent('last-watched')
    // Unspecified keys fall back to defaults
    expect(screen.getByTestId('resume')).toHaveTextContent('true')
    expect(screen.getByTestId('done')).toHaveTextContent('false')
  })

  it('ignores malformed or invalid cached values', () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ resumeCardMode: 'nonsense', showResumeCard: 'yes' }),
    )
    renderProbe()
    expect(screen.getByTestId('mode')).toHaveTextContent(DEFAULT_PREFERENCES.resumeCardMode)
    expect(screen.getByTestId('resume')).toHaveTextContent(String(DEFAULT_PREFERENCES.showResumeCard))
  })

  it('loads the signed-in user\'s saved preferences from the server', async () => {
    mockUser = { id: 'user-1' }
    maybeSingle.mockResolvedValue({
      data: { preferences: { resumeCardMode: 'last-watched', showResumeCard: false, showDoneSection: false } },
      error: null,
    })
    renderProbe()
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('last-watched'))
    expect(screen.getByTestId('resume')).toHaveTextContent('false')
    expect(screen.getByTestId('done')).toHaveTextContent('false')
    // Server row existed → nothing to seed
    expect(upsert).not.toHaveBeenCalled()
  })

  it('seeds the server from the local cache when the user has no saved row yet', async () => {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ resumeCardMode: 'last-watched' }))
    mockUser = { id: 'user-1' }
    maybeSingle.mockResolvedValue({ data: null, error: null })
    renderProbe()
    await waitFor(() => expect(upsert).toHaveBeenCalledTimes(1))
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        preferences: expect.objectContaining({ resumeCardMode: 'last-watched' }),
      }),
    )
  })

  it('persists changes to the server for a signed-in user', async () => {
    mockUser = { id: 'user-1' }
    renderProbe()
    // Ignore the initial seed upsert; assert the one caused by the edit.
    fireEvent.click(screen.getByText('hide-resume'))
    expect(screen.getByTestId('resume')).toHaveTextContent('false')
    await waitFor(() =>
      expect(upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          preferences: expect.objectContaining({ showResumeCard: false }),
        }),
      ),
    )
  })

  it('falls back to defaults with no-op setters outside a provider', () => {
    render(<Probe />)
    expect(screen.getByTestId('mode')).toHaveTextContent('up-next')
    // Setter is a no-op — clicking must not throw and state stays put
    fireEvent.click(screen.getByText('set-mode'))
    expect(screen.getByTestId('mode')).toHaveTextContent('up-next')
  })
})
