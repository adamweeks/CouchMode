import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { searchShows, posterUrl } from '../lib/tmdb'
import { useShows, useAddShow } from '../hooks/useShows'
import { useDebounce } from '../hooks/useDebounce'

export function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  const { data: myShows = [] } = useShows()
  const myTmdbIds = new Set(myShows.map(s => s.tmdb_id))

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['tmdb-search', debouncedQuery],
    queryFn: () => searchShows(debouncedQuery),
    enabled: debouncedQuery.length > 2,
  })

  const addShow = useAddShow()

  return (
    <div className="flex flex-col min-h-screen pb-[env(safe-area-inset-bottom)]">
      <header className="px-4 pt-12 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-800 text-gray-300"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-white">Add a Show</h1>
      </header>

      <div className="px-4 pb-3">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search TV shows…"
          autoFocus
          className="w-full bg-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      <main className="flex-1 px-4">
        {isFetching && (
          <div className="flex justify-center pt-8">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isFetching && debouncedQuery.length > 2 && results.length === 0 && (
          <p className="text-center text-gray-500 pt-8">No results for "{debouncedQuery}"</p>
        )}

        <div className="space-y-3">
          {results.map(result => {
            const alreadyAdded = myTmdbIds.has(String(result.id))
            return (
              <div key={result.id} className="flex gap-3 items-center bg-gray-900 rounded-2xl p-3">
                <img
                  src={posterUrl(result.poster_path)}
                  alt={result.name}
                  className="w-12 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-800"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white leading-tight line-clamp-2">{result.name}</p>
                  {result.first_air_date && (
                    <p className="text-xs text-gray-500 mt-0.5">{result.first_air_date.slice(0, 4)}</p>
                  )}
                </div>
                {alreadyAdded ? (
                  <span className="text-xs text-gray-500 flex-shrink-0">Added</span>
                ) : (
                  <button
                    onClick={async () => {
                      await addShow.mutateAsync(result)
                      navigate('/')
                    }}
                    disabled={addShow.isPending}
                    className="flex-shrink-0 px-4 py-2 bg-purple-600 text-white text-sm rounded-xl font-medium disabled:opacity-50 active:scale-95 transition-transform min-h-[44px]"
                  >
                    {addShow.isPending ? '…' : 'Add'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
