import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const TMDB_KEY = Deno.env.get('TMDB_API_KEY')!
const TMDB_BASE = 'https://api.themoviedb.org/3'

function sanitizeTitle(title: string): string {
  return title.replace(/[\r\n\t]/g, ' ').trim().slice(0, 100)
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

  // Tight per-user rate limit: every call costs an Anthropic API invocation
  // plus up to 15 TMDB searches, and the client caches results for 24h anyway.
  // Fails open if the RPC is unavailable (e.g. migration not yet applied).
  const { data: allowed, error: rateLimitError } = await supabase.rpc('consume_rate_limit', {
    bucket_name: 'suggest-shows',
    max_calls: 10,
    window_seconds: 86400,
  })
  if (rateLimitError) {
    console.error('rate limit check failed:', rateLimitError)
  } else if (!allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json().catch(() => null) as { shows?: unknown } | null
    if (body === null || (body.shows !== undefined && !Array.isArray(body.shows))) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const shows = (body.shows ?? []).filter(
      (s): s is string => typeof s === 'string' && s.trim().length > 0
    )

    if (shows.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const showList = shows.slice(0, 30).map(sanitizeTitle).join(', ')

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a TV show recommendation expert. A user has watched these shows: ${showList}

Suggest 15 TV shows they would enjoy that are NOT already in their list. For each, write a short reason (under 10 words) explaining why they'd like it.

Respond with ONLY a valid JSON array, no other text:
[{"title": "Exact Show Title", "reason": "Short reason they would enjoy it"}, ...]`,
          },
        ],
      }),
    })

    if (!claudeRes.ok) {
      const body = await claudeRes.text()
      throw new Error(`Claude API error: ${claudeRes.status} — ${body}`)
    }

    const claudeData = await claudeRes.json()
    const text: string = claudeData.content?.[0]?.text ?? '[]'

    let recommendations: Array<{ title: string; reason: string }> = []
    try {
      recommendations = JSON.parse(text)
    } catch {
      const match = text.match(/\[[\s\S]*\]/)
      if (match) recommendations = JSON.parse(match[0])
    }

    const results = await Promise.allSettled(
      recommendations.map(async ({ title, reason }) => {
        const res = await fetch(
          `${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&page=1`
        )
        const data = await res.json()
        const first = data.results?.[0]
        if (!first) return null
        return { tmdb: first, reason }
      })
    )

    const seen = new Set<number>()
    const suggestions = results
      .filter(
        (r): r is PromiseFulfilledResult<{ tmdb: unknown; reason: string }> =>
          r.status === 'fulfilled' && r.value !== null
      )
      .map(r => r.value)
      .filter(s => {
        const id = (s.tmdb as { id: number }).id
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('suggest-shows error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
