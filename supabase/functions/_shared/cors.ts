// Set VERCEL_TEAM_SLUG in Supabase edge function environment variables to allow
// deploy-preview URLs scoped to your Vercel account (e.g. 'adamweeks').
// Without it, only the exact origins below are permitted.
const VERCEL_TEAM_SLUG = Deno.env.get('VERCEL_TEAM_SLUG') ?? ''

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://couch-mode.vercel.app',
]

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true
  // Vercel preview URLs: couch-mode-<anything>-<team-slug>.vercel.app
  // Scoping to VERCEL_TEAM_SLUG prevents other Vercel users from creating
  // a matching couch-mode-* subdomain.
  if (VERCEL_TEAM_SLUG && /^https:\/\/couch-mode[^.]*\.vercel\.app$/.test(origin)) {
    return origin.endsWith(`-${VERCEL_TEAM_SLUG}.vercel.app`)
  }
  return false
}

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
  if (origin !== null && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}
