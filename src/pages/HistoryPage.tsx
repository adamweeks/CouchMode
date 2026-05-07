import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonList,
  IonItem,
  IonLabel,
  IonThumbnail,
  IonSpinner,
} from '@ionic/react'
import { AppTabBar } from '../components/AppTabBar'
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

export function HistoryPage() {
  const navigate = useNavigate()
  const { data: rewatches = [], isLoading: loadingRewatches } = useCompletedRewatches()
  const { data: shows = [], isLoading: loadingShows } = useShows()

  const isLoading = loadingRewatches || loadingShows

  const showMap = new Map(shows.map(s => [s.id, s]))

  const totalRewatches = rewatches.length
  const totalShows = new Set(rewatches.map(r => r.show_id)).size

  // Group rewatches by year
  const byYear = rewatches.reduce<Record<string, CompletedRewatch[]>>((acc, r) => {
    const year = new Date(r.completed_at).getFullYear().toString()
    if (!acc[year]) acc[year] = []
    acc[year].push(r)
    return acc
  }, {})

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a))

  return (
    <IonPage>
      <IonHeader className="gradient-header">
        <IonToolbar>
          <IonTitle>History</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
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
            {/* Stats row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                margin: '16px 16px 4px',
              }}
            >
              <div
                style={{
                  background: 'var(--ion-item-background)',
                  borderRadius: '14px',
                  padding: '14px',
                  textAlign: 'center',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                }}
              >
                <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ion-color-primary)', margin: 0 }}>
                  {totalRewatches}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: '2px 0 0' }}>
                  Total Rewatches
                </p>
              </div>
              <div
                style={{
                  background: 'var(--ion-item-background)',
                  borderRadius: '14px',
                  padding: '14px',
                  textAlign: 'center',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                }}
              >
                <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ion-color-primary)', margin: 0 }}>
                  {totalShows}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: '2px 0 0' }}>
                  Shows Rewatched
                </p>
              </div>
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

      <IonFooter>
        <AppTabBar />
      </IonFooter>
    </IonPage>
  )
}
