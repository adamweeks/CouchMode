import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const TMDB_KEY = Deno.env.get('TMDB_API_KEY')!
const TMDB_BASE = 'https://api.themoviedb.org/3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { shows } = await req.json() as { shows: string[] }

    if (!shows || shows.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const showList = shows.slice(0, 30).join(', ')

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
      throw new Error(`Claude API error: ${claudeRes.status}`)
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

    const suggestions = results
      .filter(
        (r): r is PromiseFulfilledResult<{ tmdb: unknown; reason: string }> =>
          r.status === 'fulfilled' && r.value !== null
      )
      .map(r => r.value)

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
