import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

describe('PreferencesContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('provides defaults when nothing is stored', () => {
    render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    )
    expect(screen.getByTestId('mode')).toHaveTextContent('up-next')
    expect(screen.getByTestId('resume')).toHaveTextContent('true')
    expect(screen.getByTestId('done')).toHaveTextContent('true')
  })

  it('updates state and persists to localStorage', () => {
    render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    )
    fireEvent.click(screen.getByText('set-mode'))
    expect(screen.getByTestId('mode')).toHaveTextContent('last-watched')
    expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toMatchObject({
      resumeCardMode: 'last-watched',
    })

    fireEvent.click(screen.getByText('hide-resume'))
    expect(screen.getByTestId('resume')).toHaveTextContent('false')
    expect(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY)!)).toMatchObject({
      resumeCardMode: 'last-watched',
      showResumeCard: false,
    })
  })

  it('hydrates from stored preferences', () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ resumeCardMode: 'last-watched', showDoneSection: false }),
    )
    render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    )
    expect(screen.getByTestId('mode')).toHaveTextContent('last-watched')
    // Unspecified keys fall back to defaults
    expect(screen.getByTestId('resume')).toHaveTextContent('true')
    expect(screen.getByTestId('done')).toHaveTextContent('false')
  })

  it('ignores malformed or invalid stored values', () => {
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ resumeCardMode: 'nonsense', showResumeCard: 'yes' }),
    )
    render(
      <PreferencesProvider>
        <Probe />
      </PreferencesProvider>,
    )
    expect(screen.getByTestId('mode')).toHaveTextContent(DEFAULT_PREFERENCES.resumeCardMode)
    expect(screen.getByTestId('resume')).toHaveTextContent(String(DEFAULT_PREFERENCES.showResumeCard))
  })

  it('falls back to defaults with no-op setters outside a provider', () => {
    render(<Probe />)
    expect(screen.getByTestId('mode')).toHaveTextContent('up-next')
    // Setter is a no-op — clicking must not throw and state stays put
    fireEvent.click(screen.getByText('set-mode'))
    expect(screen.getByTestId('mode')).toHaveTextContent('up-next')
  })
})
