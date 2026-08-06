/**
 * Synthetic Supabase auth session for the mocked ("Lane A") logged-in tests.
 *
 * No real GoTrue call is made: we hand-build the object supabase-js persists to
 * localStorage and seed it before the app boots. supabase-js reads the stored
 * session, sees a far-future `expires_at`, and therefore never hits the network
 * to refresh — everything else is served by the request mocks.
 */

export const TEST_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'viewer@example.com',
} as const

/**
 * supabase-js derives its localStorage key from the project URL host:
 * `sb-<first-hostname-label>-auth-token`. For the throwaway E2E URL
 * (http://127.0.0.1:54321) that resolves to `sb-127-auth-token`. Deriving it
 * here keeps the tests correct if the URL ever changes, and means we never
 * touch production `createClient` config.
 */
export function authStorageKey(supabaseUrl: string): string {
  const host = new URL(supabaseUrl).hostname
  return `sb-${host.split('.')[0]}-auth-token`
}

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

/** A JWT-shaped access token. The signature is bogus — the client never verifies it. */
function fakeAccessToken(expiresAt: number): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' })
  const payload = base64url({
    sub: TEST_USER.id,
    email: TEST_USER.email,
    role: 'authenticated',
    aud: 'authenticated',
    exp: expiresAt,
  })
  return `${header}.${payload}.e2e-signature`
}

/** The exact JSON supabase-js stores under its auth key. */
export function buildStoredSession() {
  // One year out, so `_recoverAndRefresh` treats the session as fresh.
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365
  return {
    access_token: fakeAccessToken(expiresAt),
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 60 * 60 * 24 * 365,
    expires_at: expiresAt,
    user: {
      id: TEST_USER.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: TEST_USER.email,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  }
}
