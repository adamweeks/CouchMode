import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import type { User } from '@supabase/supabase-js'

export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User', avatar_url: null },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
} as unknown as User

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

export function createWrapper(initialPath = '/') {
  const queryClient = createQueryClient()
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialPath]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  return { Wrapper, queryClient }
}

/**
 * Creates a chainable Supabase query builder mock.
 * All chain methods return `this` so chaining works.
 * Terminal methods (single, maybeSingle) and the chain itself are awaitable.
 */
export function createSupabaseChain(result: { data: unknown; error: unknown } = { data: [], error: null }) {
  let currentResult = result

  const chain: Record<string, unknown> & PromiseLike<typeof result> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    in: vi.fn(),
    or: vi.fn(),
    not: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: (onFulfilled: (value: typeof result) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(currentResult).then(onFulfilled, onRejected),
  }

  // all chain methods return the same chain for further chaining
  for (const m of ['select', 'eq', 'order', 'in', 'or', 'not', 'update', 'delete', 'upsert']) {
    ;(chain[m] as ReturnType<typeof vi.fn>).mockReturnValue(chain)
  }

  // insert returns a chain with a select() that returns the chain (for .insert().select().single())
  ;(chain.insert as ReturnType<typeof vi.fn>).mockReturnValue({
    ...chain,
    select: vi.fn().mockReturnValue(chain),
  })

  ;(chain.single as ReturnType<typeof vi.fn>).mockImplementation(() =>
    Promise.resolve(currentResult),
  )
  ;(chain.maybeSingle as ReturnType<typeof vi.fn>).mockImplementation(() =>
    Promise.resolve(currentResult),
  )

  return {
    chain,
    setResult: (r: { data: unknown; error: unknown }) => {
      currentResult = r
    },
  }
}

export const mockAuthContextValue = {
  user: mockUser,
  session: null,
  loading: false,
  signUp: vi.fn(),
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}
