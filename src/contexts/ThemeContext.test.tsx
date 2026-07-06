import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ThemeProvider, useTheme, THEME_STORAGE_KEY } from './ThemeContext'

type ChangeListener = (e: { matches: boolean }) => void

/**
 * Installs a controllable matchMedia mock for prefers-color-scheme: dark.
 * Returns a function that simulates the device setting changing.
 */
function mockMatchMedia(initialDark: boolean) {
  let matches = initialDark
  const listeners = new Set<ChangeListener>()

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, cb: ChangeListener) => listeners.add(cb),
    removeEventListener: (_: string, cb: ChangeListener) => listeners.delete(cb),
    dispatchEvent: () => false,
  }))

  return (dark: boolean) => {
    matches = dark
    listeners.forEach(cb => cb({ matches: dark }))
  }
}

function Consumer() {
  const { preference, resolvedTheme, setPreference } = useTheme()
  return (
    <div>
      <span data-testid="preference">{preference}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setPreference('dark')}>set dark</button>
      <button onClick={() => setPreference('light')}>set light</button>
      <button onClick={() => setPreference('system')}>set system</button>
    </div>
  )
}

function renderWithTheme() {
  return render(
    <ThemeProvider>
      <Consumer />
    </ThemeProvider>,
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('defaults to system preference and resolves light when device is light', () => {
    mockMatchMedia(false)
    renderWithTheme()
    expect(screen.getByTestId('preference').textContent).toBe('system')
    expect(screen.getByTestId('resolved').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('resolves dark when device prefers dark', () => {
    mockMatchMedia(true)
    renderWithTheme()
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('follows a live device setting change while preference is system', () => {
    const setDeviceDark = mockMatchMedia(false)
    renderWithTheme()
    expect(screen.getByTestId('resolved').textContent).toBe('light')

    act(() => setDeviceDark(true))
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('manual dark preference overrides a light device setting and persists', () => {
    mockMatchMedia(false)
    renderWithTheme()

    fireEvent.click(screen.getByText('set dark'))
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('manual light preference overrides a dark device setting', () => {
    mockMatchMedia(true)
    renderWithTheme()

    fireEvent.click(screen.getByText('set light'))
    expect(screen.getByTestId('resolved').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('ignores device setting changes while a manual preference is set', () => {
    const setDeviceDark = mockMatchMedia(false)
    renderWithTheme()

    fireEvent.click(screen.getByText('set light'))
    act(() => setDeviceDark(true))
    expect(screen.getByTestId('resolved').textContent).toBe('light')
  })

  it('returning to system preference re-syncs with the device setting', () => {
    mockMatchMedia(true)
    renderWithTheme()

    fireEvent.click(screen.getByText('set light'))
    expect(screen.getByTestId('resolved').textContent).toBe('light')

    fireEvent.click(screen.getByText('set system'))
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
  })

  it('reads the stored preference on init', () => {
    mockMatchMedia(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    renderWithTheme()
    expect(screen.getByTestId('preference').textContent).toBe('dark')
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
  })

  it('falls back to system when the stored value is invalid', () => {
    mockMatchMedia(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'bogus')
    renderWithTheme()
    expect(screen.getByTestId('preference').textContent).toBe('system')
  })

  it('throws when useTheme is used outside a ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow('useTheme must be used within a ThemeProvider')
    spy.mockRestore()
  })
})
