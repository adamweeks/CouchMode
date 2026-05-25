import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  useIonAlert,
  IonIcon,
} from '@ionic/react'
import { playOutline, checkmarkDoneOutline, listOutline, arrowBackOutline, tvOutline } from 'ionicons/icons'
import { useShows, useAddShow, useRemoveShow } from '../hooks/useShows'
import { useRewatches, useActiveRewatch } from '../hooks/useRewatches'
import { useCurrentProgress } from '../hooks/useProgressLogs'
import { useLogEpisodeSheet } from '../hooks/useLogEpisodeSheet'
import { useTMDBShow } from '../hooks/useTMDBShow'
import { useTMDBSeason } from '../hooks/useTMDBSeason'
import { MarkFinishedModal } from '../components/MarkFinishedModal'
import { LogProgressModal } from '../components/LogProgressModal'
import { BrowseEpisodesModal } from '../components/BrowseEpisodesModal'
import { BottomNav } from '../components/BottomNav'
import { EditServiceModal } from '../components/EditServiceModal'
import { ServiceSelector } from '../components/ServiceSelector'
import { formatProgress, formatDuration, formatMonthYear, countWatchedEpisodes } from '../lib/progressLogic'
import { posterUrl, providerLogoUrl } from '../lib/tmdb'
import type { TMDBWatchProvider } from '../lib/tmdb'

type Rewatch = { id: string; completed_at: string | null; started_at: string; note: string | null; service: string | null; status: string }

function avgDaysBetweenRewatches(rewatches: Rewatch[]): number | null {
  if (rewatches.length < 2) return null
  const dates = rewatches
    .map(r => new Date(r.completed_at!).getTime())
    .sort((a, b) => a - b)
  let total = 0
  for (let i = 1; i < dates.length; i++) total += dates[i] - dates[i - 1]
  return Math.round(total / (dates.length - 1) / (1000 * 60 * 60 * 24))
}

const card: React.CSSProperties = {
  background: 'var(--ion-item-background)',
  margin: '0 16px 12px',
  borderRadius: '14px',
  boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
  overflow: 'hidden',
}

const sectionLabel: React.CSSProperties = {
  padding: '0 20px 6px',
  fontSize: '12px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: 'var(--ion-color-medium)',
}

export function ShowDetailPage() {
  const { tmdbId } = useParams<{ tmdbId: string }>()
  const navigate = useNavigate()
  const [showFinishedModal, setShowFinishedModal] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showEditServiceModal, setShowEditServiceModal] = useState(false)
  const [addShowService, setAddShowService] = useState('')
  const [browseSeason, setBrowseSeason] = useState<number | null>(null)
  const [presentAlert] = useIonAlert()

  const { data: tmdbShow, isLoading: isLoadingTMDB } = useTMDBShow(tmdbId)

  const { data: myShows = [], isLoading: isLoadingShows } = useShows()
  const show = myShows.find(s => s.tmdb_id === tmdbId) ?? null

  const { data: rewatches = [] } = useRewatches(show?.id ?? '')
  const { data: activeRewatch } = useActiveRewatch(show?.id ?? '')
  const currentProgress = useCurrentProgress(activeRewatch?.id)

  const { data: currentSeasonData } = useTMDBSeason(
    tmdbId ?? null,
    currentProgress?.season ?? 1,
  )
  const currentEpisode = currentSeasonData?.episodes?.find(
    e => e.episode_number === currentProgress?.episode,
  )

  const { nextEp, logNext } = useLogEpisodeSheet(
    show,
    activeRewatch?.id,
    currentProgress,
    activeRewatch ? () => setShowLogModal(true) : undefined,
  )
  const { data: nextSeasonData } = useTMDBSeason(
    tmdbId ?? null,
    nextEp?.season ?? 0,
  )
  const nextEpisodeEps = nextEp?.season === (currentProgress?.season ?? 0)
    ? currentSeasonData?.episodes
    : nextSeasonData?.episodes
  const nextEpisode = nextEp ? nextEpisodeEps?.find(e => e.episode_number === nextEp.episode) : undefined

  const addShow = useAddShow()
  const removeShow = useRemoveShow()

  const title = tmdbShow?.name ?? show?.title ?? ''
  const year = tmdbShow?.first_air_date?.slice(0, 4)
  const genres = tmdbShow?.genres?.slice(0, 2).map(g => g.name).join(' · ')
  const ended = tmdbShow?.status === 'Ended' || tmdbShow?.status === 'Canceled'
  const tmdbSeasons = tmdbShow ? tmdbShow.seasons.filter(s => s.season_number > 0) : []
  const totalTmdbEps = tmdbSeasons.reduce((sum, s) => sum + s.episode_count, 0)

  const totalEpisodes = show?.episodes_per_season.reduce((s, n) => s + n, 0) ?? 0
  const watchedEps = currentProgress && show ? countWatchedEpisodes(show.episodes_per_season, currentProgress) : 0
  const pct = totalEpisodes > 0 ? Math.round((watchedEps / totalEpisodes) * 100) : 0
  const completedRewatches = rewatches.filter(r => r.status === 'completed')
  const avgDays = avgDaysBetweenRewatches(completedRewatches)
  const providers = (show?.streaming_providers as TMDBWatchProvider[] | null) ?? null
  const providerNames = providers?.map(p => p.provider_name)

  function handleRemove() {
    presentAlert({
      header: `Remove ${show!.title}?`,
      message: 'All rewatch history will be permanently deleted.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: async () => {
            await removeShow.mutateAsync(show!.id)
            navigate('/', { replace: true })
          },
        },
      ],
    })
  }

  if (isLoadingTMDB || isLoadingShows) {
    return (
      <IonPage>
        <IonHeader className="gradient-header">
          <IonToolbar>
            <IonButtons slot="start"><IonButton onClick={() => navigate(-1)}><IonIcon slot="icon-only" icon={arrowBackOutline} /></IonButton></IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="flex justify-center pt-16" role="status" aria-label="Loading">
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    )
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => navigate(-1)}><IonIcon slot="icon-only" icon={arrowBackOutline} /></IonButton>
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="tab-page-content">
        <div style={{ ...card, margin: '12px 16px 12px' }}>
          <div style={{ display: 'flex', gap: '12px', padding: '12px 12px 10px' }}>
            <img
              src={posterUrl(tmdbShow?.poster_path ?? show?.poster_url)}
              alt={title}
              style={{
                width: '72px',
                height: '108px',
                borderRadius: '8px',
                objectFit: 'cover',
                flexShrink: 0,
                background: 'var(--ion-color-light)',
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px', lineHeight: 1.3 }}>{title}</h2>
              <p style={{ fontSize: '11px', color: 'var(--ion-color-medium)', margin: '0 0 6px' }}>
                {[year, genres, ended ? 'Ended' : tmdbShow ? 'Ongoing' : null].filter(Boolean).join(' · ')}
              </p>
              {tmdbSeasons.length > 0 && (
                <p style={{ fontSize: '11px', color: 'var(--ion-color-medium)', margin: '0 0 6px' }}>
                  {tmdbSeasons.length} season{tmdbSeasons.length !== 1 ? 's' : ''} · {totalTmdbEps} episodes
                </p>
              )}
              {show && currentProgress ? (
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ion-color-primary)', margin: 0 }}>
                  {formatProgress(currentProgress.season, currentProgress.episode)}
                  {currentEpisode && (
                    <span style={{ fontWeight: 400, color: 'var(--ion-color-medium)', fontSize: '12px' }}>
                      {' '}· {currentEpisode.name}
                    </span>
                  )}
                </p>
              ) : show ? (
                <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: 0 }}>
                  {completedRewatches.length > 0
                    ? `Completed ${completedRewatches.length} time${completedRewatches.length !== 1 ? 's' : ''}`
                    : 'Not started'}
                </p>
              ) : null}
            </div>
          </div>
          {show && currentProgress && totalEpisodes > 0 && (
            <div style={{ padding: '0 12px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: 'var(--ion-color-medium)' }}>Series progress</span>
                <span style={{ fontSize: '10px', color: 'var(--ion-color-medium)' }}>Ep {watchedEps} of {totalEpisodes} · {pct}%</span>
              </div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'var(--ion-color-light)' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: '2px', background: 'var(--ion-color-primary)' }} />
              </div>
            </div>
          )}
        </div>

        {show && currentProgress && currentEpisode && (
          <>
            <p style={sectionLabel}>Last Watched</p>
            <div style={card}>
              {currentEpisode.still_path && (
                <img
                  src={posterUrl(currentEpisode.still_path)}
                  alt=""
                  aria-hidden="true"
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                />
              )}
              <div style={{ padding: '12px 14px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px' }}>
                  {formatProgress(currentProgress.season, currentProgress.episode)} · {currentEpisode.name}
                </p>
                {currentEpisode.overview && (
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--ion-color-medium)',
                    margin: 0,
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical' as const,
                  }}>
                    {currentEpisode.overview}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {show && activeRewatch && nextEp && (
          <>
            <p style={sectionLabel}>Up Next</p>
            <div style={card}>
              {nextEpisode?.still_path && (
                <img
                  src={posterUrl(nextEpisode.still_path)}
                  alt=""
                  aria-hidden="true"
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                />
              )}
              <div style={{ padding: '12px 14px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px' }}>
                  {formatProgress(nextEp.season, nextEp.episode)}
                  {nextEpisode?.name && (
                    <span style={{ fontWeight: 400, color: 'var(--ion-color-medium)' }}> · {nextEpisode.name}</span>
                  )}
                </p>
                {nextEpisode?.overview && (
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--ion-color-medium)',
                    margin: '0 0 12px',
                    lineHeight: 1.5,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical' as const,
                  }}>
                    {nextEpisode.overview}
                  </p>
                )}
                <IonButton expand="block" onClick={logNext ?? undefined}>
                  <IonIcon slot="start" icon={playOutline} />
                  Log {formatProgress(nextEp.season, nextEp.episode)}
                </IonButton>
              </div>
            </div>
            <div style={{ margin: '0 16px 4px', display: 'flex', gap: '8px' }}>
              <IonButton expand="block" fill="outline" style={{ flex: 1 }} onClick={() => setShowLogModal(true)}>
                <IonIcon slot="start" icon={listOutline} />
                Pick Episode
              </IonButton>
              <IonButton expand="block" fill="outline" color="success" style={{ flex: 1 }} onClick={() => setShowFinishedModal(true)}>
                <IonIcon slot="start" icon={checkmarkDoneOutline} />
                Finished
              </IonButton>
            </div>
            <div style={{ margin: '0 16px 12px' }}>
              <IonButton
                expand="block"
                fill="outline"
                color="medium"
                size="small"
                onClick={() => setShowEditServiceModal(true)}
              >
                <IonIcon slot="start" icon={tvOutline} />
                {activeRewatch?.service ? activeRewatch.service : 'Set service'}
              </IonButton>
            </div>
          </>
        )}

        {tmdbShow?.overview && (
          <>
            <p style={sectionLabel}>Overview</p>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--ion-color-medium)', margin: '0 16px 16px' }}>
              {tmdbShow.overview}
            </p>
          </>
        )}

        {tmdbSeasons.length > 0 && (
          <>
            <p style={sectionLabel}>Seasons</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '0 16px 16px' }}>
              {tmdbSeasons.map(s => (
                <button
                  key={s.season_number}
                  onClick={() => setBrowseSeason(s.season_number)}
                  style={{
                    background: 'var(--ion-item-background)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>S{s.season_number}</span>
                  <span style={{ color: 'var(--ion-color-medium)', marginLeft: '4px' }}>
                    {s.episode_count} ep{s.episode_count !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {show && providers && providers.length > 0 && (
          <>
            <p style={sectionLabel}>Available On</p>
            <div
              role="list"
              aria-label="Streaming services"
              style={{ display: 'flex', gap: '10px', margin: '0 16px 16px', flexWrap: 'wrap' }}
            >
              {providers.map(p => (
                <div
                  key={p.provider_id}
                  role="listitem"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
                >
                  <img
                    src={providerLogoUrl(p.logo_path)}
                    alt={p.provider_name}
                    style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }}
                  />
                  <span style={{ fontSize: '10px', color: 'var(--ion-color-medium)', textAlign: 'center', maxWidth: '48px', lineHeight: 1.2 }}>
                    {p.provider_name}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {show && completedRewatches.length > 0 && (
          <>
            <p style={sectionLabel}>Stats</p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: avgDays !== null ? '1fr 1fr' : '1fr',
                gap: '12px',
                margin: '0 16px 12px',
              }}
            >
              <div style={{ background: 'var(--ion-item-background)', borderRadius: '14px', padding: '14px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ion-color-primary)', margin: 0 }}>
                  {completedRewatches.length}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: '2px 0 0' }}>Rewatches</p>
              </div>
              {avgDays !== null && (
                <div style={{ background: 'var(--ion-item-background)', borderRadius: '14px', padding: '14px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
                  <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ion-color-primary)', margin: 0 }}>
                    {avgDays}d
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: '2px 0 0' }}>Avg between rewatches</p>
                </div>
              )}
            </div>
          </>
        )}

        {show && completedRewatches.length > 0 && (
          <>
            <p style={sectionLabel}>Rewatch History</p>
            <IonList inset className="inset-shadow">
              {completedRewatches.map((rewatch, i) => (
                <IonItem key={rewatch.id}>
                  <IonLabel>
                    <h3 style={{ fontWeight: 600, fontSize: '14px' }}>
                      Rewatch #{completedRewatches.length - i}
                    </h3>
                    {rewatch.started_at && rewatch.completed_at && (
                      <p style={{ fontSize: '12px' }}>
                        {formatDuration(rewatch.started_at, rewatch.completed_at)}
                        {rewatch.service && (
                          <span style={{ color: 'var(--ion-color-medium)' }}> · {rewatch.service}</span>
                        )}
                      </p>
                    )}
                    {!rewatch.started_at && rewatch.service && (
                      <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)' }}>{rewatch.service}</p>
                    )}
                    {rewatch.note && (
                      <p style={{ fontSize: '12px', fontStyle: 'italic' }}>"{rewatch.note}"</p>
                    )}
                  </IonLabel>
                  {rewatch.completed_at && (
                    <p slot="end" style={{ color: 'var(--ion-color-medium)', fontSize: '12px', margin: 0 }}>
                      {formatMonthYear(rewatch.completed_at)}
                    </p>
                  )}
                </IonItem>
              ))}
            </IonList>
          </>
        )}

        <div style={{ padding: '8px 16px 32px' }}>
          {show ? (
            <IonButton expand="block" fill="outline" color="danger" onClick={handleRemove}>
              Remove from Rotation
            </IonButton>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ServiceSelector
                value={addShowService}
                onChange={setAddShowService}
                label="Watching on (optional)"
                availableOn={providerNames}
              />
              <IonButton
                expand="block"
                disabled={addShow.isPending || !tmdbShow}
                onClick={async () => {
                  if (!tmdbShow) return
                  await addShow.mutateAsync({
                    id: tmdbShow.id,
                    name: tmdbShow.name,
                    poster_path: tmdbShow.poster_path,
                    first_air_date: tmdbShow.first_air_date,
                    overview: tmdbShow.overview,
                    service: addShowService || undefined,
                  })
                }}
              >
                {addShow.isPending ? 'Adding…' : 'Add to Rotation'}
              </IonButton>
            </div>
          )}
        </div>
      </IonContent>

      <BottomNav />

      {showFinishedModal && activeRewatch && show && (
        <MarkFinishedModal
          showId={show.id}
          rewatchId={activeRewatch.id}
          rewatchStartedAt={activeRewatch.started_at}
          currentService={activeRewatch.service ?? null}
          onClose={() => setShowFinishedModal(false)}
          availableOn={providerNames}
        />
      )}

      {showLogModal && activeRewatch && show && (
        <LogProgressModal
          show={show}
          rewatchId={activeRewatch.id}
          onClose={() => setShowLogModal(false)}
        />
      )}

      {showEditServiceModal && activeRewatch && show && (
        <EditServiceModal
          showId={show.id}
          rewatchId={activeRewatch.id}
          currentService={activeRewatch.service ?? null}
          onClose={() => setShowEditServiceModal(false)}
          availableOn={providerNames}
        />
      )}

      {browseSeason !== null && tmdbShow && (
        <BrowseEpisodesModal
          tmdbId={tmdbId!}
          title={title}
          seasons={tmdbSeasons}
          initialSeason={browseSeason}
          onClose={() => setBrowseSeason(null)}
        />
      )}
    </IonPage>
  )
}
