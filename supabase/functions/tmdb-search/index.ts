import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_KEY = Deno.env.get('TMDB_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const query = url.searchParams.get('query')
    const tmdbId = url.searchParams.get('tmdb_id')

    if (tmdbId) {
      const res = await fetch(`${TMDB_BASE}/tv/${tmdbId}?api_key=${TMDB_KEY}`)
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
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
