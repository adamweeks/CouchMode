import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

const {
  mockUnsubscribe,
  mockGetSession,
  mockOnAuthStateChange,
  mockSignUp,
  mockSignInWithPassword,
  mockSignInWithOAuth,
  mockSignOut,
} = vi.hoisted(() => ({
  mockUnsubscribe: vi.fn(),
  mockGetSession: vi.fn(),
  mockOnAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
  mockSignUp: vi.fn(),
  mockSignInWithPassword: vi.fn(),
  mockSignInWithOAuth: vi.fn(),
  mockSignOut: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
    },
  },
}))

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children)

describe('useAuth', () => {
  it('throws when called outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within AuthProvider')
  })
})

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    })
  })

  it('starts with loading=true, then false after getSession resolves', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('user is null when getSession returns no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
  })

  it('user is set when getSession returns a session with user', async () => {
    const mockUser = { id: 'u1', email: 'test@example.com' }
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser } },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toEqual(mockUser)
  })

  it('updates user when auth state changes', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    let authStateCallback: ((event: string, session: unknown) => void) | null = null
    mockOnAuthStateChange.mockImplementation((cb: typeof authStateCallback) => {
      authStateCallback = cb
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const newUser = { id: 'u2', email: 'new@example.com' }
    act(() => {
      authStateCallback?.('SIGNED_IN', { user: newUser })
    })

    expect(result.current.user).toEqual(newUser)
  })

  it('signUp calls supabase.auth.signUp', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockSignUp.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.signUp('a@b.com', 'pass')
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' })
  })

  it('signUp throws on error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    const err = new Error('signup failed')
    mockSignUp.mockResolvedValue({ error: err })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.signUp('a@b.com', 'pass')).rejects.toThrow('signup failed')
  })

  it('signInWithGoogle calls supabase.auth.signInWithOAuth', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockSignInWithOAuth.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.signInWithGoogle()
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    )
  })

  it('signOut calls supabase.auth.signOut', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockSignOut.mockResolvedValue({ error: null })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.signOut()
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('signOut throws on error', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    const err = new Error('signout failed')
    mockSignOut.mockResolvedValue({ error: err })

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.signOut()).rejects.toThrow('signout failed')
  })

  it('cleans up the auth subscription on unmount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const { unmount } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result => result).toBeTruthy())
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
