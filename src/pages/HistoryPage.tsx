import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonSpinner,
} from '@ionic/react'
import { BottomNav } from '../components/BottomNav'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useShows } from '../hooks/useShows'
import { formatMonthYear } from '../lib/progressLogic'

interface CompletedRewatch {
  id: string
  show_id: string
  completed_at: string
  started_at: string
}

function useCompletedRewatches() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['rewatches', 'all', 'completed', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewatches')
        .select('id, show_id, completed_at, started_at')
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
      if (error) throw error
      return data as CompletedRewatch[]
    },
    enabled: !!user,
  })
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div
      style={{
        background: 'var(--ion-item-background)',
        borderRadius: '14px',
        padding: '14px',
        textAlign: 'center',
        boxShadow: 'var(--app-card-shadow)',
      }}
    >
      <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ion-color-primary)', margin: 0 }}>
        {value}
      </p>
      <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: '2px 0 0' }}>
        {label}
      </p>
    </div>
  )
}

export function HistoryPage() {
  const navigate = useNavigate()
  const { data: rewatches = [], isLoading: loadingRewatches } = useCompletedRewatches()
  const { data: shows = [], isLoading: loadingShows } = useShows()

  const isLoading = loadingRewatches || loadingShows

  const showMap = new Map(shows.map(s => [s.id, s]))

  const totalRewatches = rewatches.length
  const totalShows = new Set(rewatches.map(r => r.show_id)).size

  const totalEpisodes = rewatches.reduce((sum, r) => {
    const show = showMap.get(r.show_id)
    if (!show) return sum
    return sum + show.episodes_per_season.reduce((s: number, n: number) => s + n, 0)
  }, 0)

  // ~42 min/ep average for scripted TV
  const estHours = Math.round(totalEpisodes * 42 / 60)

  const rewatchCountByShowId = rewatches.reduce<Record<string, number>>((acc, r) => {
    acc[r.show_id] = (acc[r.show_id] ?? 0) + 1
    return acc
  }, {})
  const mostRewatchedEntry = Object.entries(rewatchCountByShowId).sort((a, b) => b[1] - a[1])[0]
  const mostRewatchedShow = mostRewatchedEntry ? showMap.get(mostRewatchedEntry[0]) : null
  const mostRewatchedCount = mostRewatchedEntry?.[1] ?? 0

  const rewatchesWithDates = rewatches.filter(r => r.started_at && r.completed_at)
  const avgDays =
    rewatchesWithDates.length > 0
      ? Math.round(
          rewatchesWithDates.reduce((sum, r) => {
            return (
              sum +
              (new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          }, 0) / rewatchesWithDates.length
        )
      : null

  const byYear = rewatches.reduce<Record<string, CompletedRewatch[]>>((acc, r) => {
    const year = new Date(r.completed_at).getFullYear().toString()
    if (!acc[year]) acc[year] = []
    acc[year].push(r)
    return acc
  }, {})

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a))
  const currentYear = new Date().getFullYear().toString()
  const rewatchesThisYear = byYear[currentYear]?.length ?? 0

  return (
    <IonPage>
      <IonHeader className="gradient-header">
        <IonToolbar>
          <IonTitle>History</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="tab-page-content">
        {isLoading ? (
          <div className="flex justify-center pt-16" role="status" aria-label="Loading history">
            <IonSpinner name="crescent" />
          </div>
        ) : rewatches.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60%',
              textAlign: 'center',
              padding: '48px 24px',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '48px', opacity: 0.3 }}>📖</span>
            <p style={{ fontSize: '15px', color: 'var(--ion-color-medium)' }}>
              No completed rewatches yet
            </p>
          </div>
        ) : (
          <>
            {/* Stats section */}
            <div style={{ margin: '16px 16px 4px' }}>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--ion-color-medium)',
                  margin: '0 0 10px',
                }}
              >
                Your Stats
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginBottom: '10px',
                }}
              >
                <StatCard value={totalRewatches} label="Total Rewatches" />
                <StatCard value={totalShows} label="Shows Rewatched" />
                <StatCard value={totalEpisodes.toLocaleString()} label="Episodes Watched" />
                <StatCard value={`${estHours.toLocaleString()}h`} label="Est. Hours" />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginBottom: mostRewatchedShow && mostRewatchedCount > 1 ? '10px' : '4px',
                }}
              >
                <StatCard
                  value={avgDays !== null ? (avgDays === 0 ? '<1' : avgDays) : '—'}
                  label="Avg. Days / Rewatch"
                />
                <StatCard value={rewatchesThisYear} label={`In ${currentYear}`} />
              </div>

              {mostRewatchedShow && mostRewatchedCount > 1 && (
                <div
                  style={{
                    background: 'var(--ion-item-background)',
                    borderRadius: '14px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: 'var(--app-card-shadow)',
                    marginBottom: '4px',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/tmdb/${mostRewatchedShow.tmdb_id}`)}
                >
                  <img
                    src={mostRewatchedShow.poster_url ?? '/placeholder-poster.svg'}
                    alt={mostRewatchedShow.title}
                    style={{
                      width: '40px',
                      height: '54px',
                      borderRadius: '6px',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p
                      style={{
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'var(--ion-color-medium)',
                        margin: '0 0 2px',
                      }}
                    >
                      Most Rewatched
                    </p>
                    <p style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 2px' }}>
                      {mostRewatchedShow.title}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--ion-color-primary)', margin: 0 }}>
                      watched {mostRewatchedCount}×
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Year-grouped rewatch list */}
            {years.map(year => (
              <div key={year}>
                <p
                  style={{
                    padding: '12px 20px 6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'var(--ion-color-medium)',
                  }}
                >
                  {year}
                </p>
                <IonList inset className="inset-shadow">
                  {byYear[year].map(rewatch => {
                    const show = showMap.get(rewatch.show_id)
                    if (!show) return null
                    return (
                      <IonItem
                        key={rewatch.id}
                        button
                        detail
                        onClick={() => navigate(`/tmdb/${show.tmdb_id}`)}
                      >
                        <IonThumbnail
                          slot="start"
                          style={
                            {
                              '--size': '40px',
                              '--border-radius': '6px',
                              height: '54px',
                              paddingTop: '8px',
                              paddingBottom: '8px',
                            } as React.CSSProperties
                          }
                        >
                          <img
                            src={show.poster_url ?? '/placeholder-poster.svg'}
                            alt={show.title}
                            loading="lazy"
                            style={{ objectFit: 'cover', height: '100%', width: '100%', borderRadius: '6px' }}
                          />
                        </IonThumbnail>
                        <IonLabel>
                          <h2 style={{ fontWeight: 600, fontSize: '14px' }}>{show.title}</h2>
                          <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                            Completed {formatMonthYear(rewatch.completed_at)}
                          </p>
                        </IonLabel>
                      </IonItem>
                    )
                  })}
                </IonList>
              </div>
            ))}
          </>
        )}
      </IonContent>

      <BottomNav />
    </IonPage>
  )
}
