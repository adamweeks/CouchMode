import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = Deno.env.get('TMDB_API_KEY')!

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://couch-mode.vercel.app',
]

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin !== null &&
    (ALLOWED_ORIGINS.includes(origin) ||
      /^https:\/\/couch-mode(-[^.]+)?\.vercel\.app$/.test(origin))
  return {
    'Access-Control-Allow-Origin': allowed ? origin! : ALLOWED_ORIGINS[2],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(req.url)
    const query = url.searchParams.get('query')
    const tmdbId = url.searchParams.get('tmdb_id')

    if (tmdbId) {
      if (!/^\d+$/.test(tmdbId)) {
        return new Response(JSON.stringify({ error: 'Invalid tmdb_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const season = url.searchParams.get('season')
      if (season !== null && !/^\d+$/.test(season)) {
        return new Response(JSON.stringify({ error: 'Invalid season' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const providers = url.searchParams.get('providers')
      let tmdbUrl: string
      if (providers) {
        tmdbUrl = `${TMDB_BASE}/tv/${tmdbId}/watch/providers?api_key=${TMDB_KEY}`
      } else if (season) {
        tmdbUrl = `${TMDB_BASE}/tv/${tmdbId}/season/${season}?api_key=${TMDB_KEY}`
      } else {
        tmdbUrl = `${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_KEY}`
      }
      const res = await fetch(tmdbUrl)
      const data = await res.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!query) {
      return new Response(JSON.stringify({ error: 'query or tmdb_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch(
      `${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=1`
    )
    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('tmdb-search error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
