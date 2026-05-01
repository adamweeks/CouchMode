const TMDB_BASE = 'https://api.themoviedb.org/3'

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url)
  const tmdbId = searchParams.get('tmdb_id')
  const season = searchParams.get('season')

  if (!tmdbId || !season) {
    return Response.json({ error: 'tmdb_id and season required' }, { status: 400 })
  }

  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'TMDB_API_KEY not configured' }, { status: 500 })
  }

  const res = await fetch(
    `${TMDB_BASE}/tv/${tmdbId}/season/${season}?api_key=${apiKey}`
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export const config = { runtime: 'edge' }
