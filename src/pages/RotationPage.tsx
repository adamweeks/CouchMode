import { Link } from 'react-router-dom'
import { useShows } from '../hooks/useShows'
import { ShowCard } from '../components/ShowCard'

export function RotationPage() {
  const { data: shows = [], isLoading } = useShows()

  return (
    <div className="flex flex-col min-h-screen pb-[env(safe-area-inset-bottom)]">
      <header className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white">My Rotation</h1>
      </header>

      <main className="flex-1 px-4 pb-24">
        {isLoading ? (
          <div className="flex justify-center pt-16">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shows.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center space-y-4">
            <div className="text-5xl">📺</div>
            <h2 className="text-xl font-semibold text-white">No shows yet</h2>
            <p className="text-gray-400 text-sm max-w-xs">
              Add the shows you rewatch regularly to start tracking your progress.
            </p>
            <Link
              to="/search"
              className="mt-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium active:scale-95 transition-transform"
            >
              Add Your First Show
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {shows.map(show => (
              <ShowCard key={show.id} show={show} />
            ))}
          </div>
        )}
      </main>

      <Link
        to="/search"
        className="fixed bottom-6 right-4 w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform text-2xl"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        aria-label="Add show"
      >
        +
      </Link>
    </div>
  )
}
