import { useIonActionSheet, useIonAlert, useIonToast } from '@ionic/react'
import {
  playOutline,
  listOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
} from 'ionicons/icons'
import { useNavigate } from 'react-router-dom'
import { useLogProgress } from './useProgressLogs'
import { getErrorMessage } from '../lib/progressLogic'
import type { Database } from '../lib/database.types'

type Show = Database['public']['Tables']['shows']['Row']

export function useLogEpisodeSheet(
  show: Show | null,
  activeRewatchId: string | null | undefined,
  currentProgress: { season: number; episode: number } | null | undefined,
  onPickSpecific?: () => void,
) {
  const navigate = useNavigate()
  const [presentActionSheet] = useIonActionSheet()
  const [presentAlert] = useIonAlert()
  const [presentToast] = useIonToast()
  const logProgress = useLogProgress()

  function getNextEp() {
    if (!show || !activeRewatchId) return null
    if (!currentProgress) return { season: 1, episode: 1 }
    const maxEp = show.episodes_per_season[currentProgress.season - 1] ?? 1
    if (currentProgress.episode < maxEp) {
      return { season: currentProgress.season, episode: currentProgress.episode + 1 }
    } else if (currentProgress.season < show.total_seasons) {
      return { season: currentProgress.season + 1, episode: 1 }
    }
    return null
  }

  async function doLog(season: number, episode: number) {
    if (!show || !activeRewatchId) return
    try {
      await logProgress.mutateAsync({
        rewatchId: activeRewatchId,
        showId: show.id,
        season,
        episode,
        totalSeasons: show.total_seasons,
        episodesPerSeason: show.episodes_per_season,
      })
      presentToast({
        message: `S${season} E${episode} logged`,
        duration: 2500,
        position: 'bottom',
        color: 'dark',
      })
    } catch (e) {
      presentToast({
        message: getErrorMessage(e),
        duration: 3000,
        position: 'bottom',
        color: 'danger',
      })
    }
  }

  function present() {
    if (!show || !activeRewatchId) return
    const nextEp = getNextEp()
    const currentSeason = currentProgress?.season ?? 1
    const maxEpInSeason = show.episodes_per_season[currentSeason - 1] ?? 1

    presentActionSheet({
      header: show.title,
      subHeader: currentProgress ? `Currently S${currentProgress.season} E${currentProgress.episode}` : undefined,
      buttons: [
        ...(nextEp
          ? [
              {
                text: `Log Next Episode (S${nextEp.season} E${nextEp.episode})`,
                icon: playOutline,
                handler: () => {
                  doLog(nextEp.season, nextEp.episode)
                },
              },
            ]
          : []),
        {
          text: 'Pick Specific Episode',
          icon: listOutline,
          handler: () => {
            if (onPickSpecific) {
              onPickSpecific()
            } else {
              presentAlert({
                header: 'Pick Episode',
                message: 'Enter the season and episode you just watched.',
                inputs: [
                  {
                    name: 'season',
                    type: 'number',
                    placeholder: 'Season',
                    value: String(currentProgress?.season ?? 1),
                    min: 1,
                    max: show.total_seasons,
                  },
                  {
                    name: 'episode',
                    type: 'number',
                    placeholder: 'Episode',
                    value: String((currentProgress?.episode ?? 0) + 1),
                    min: 1,
                  },
                ],
                buttons: [
                  { text: 'Cancel', role: 'cancel' },
                  {
                    text: 'Log It',
                    handler: (data) => {
                      const s = parseInt(data.season, 10)
                      const ep = parseInt(data.episode, 10)
                      if (!isNaN(s) && !isNaN(ep) && s >= 1 && ep >= 1) doLog(s, ep)
                    },
                  },
                ],
              })
            }
          },
        },
        {
          text: `Mark Season ${currentSeason} Complete`,
          icon: checkmarkCircleOutline,
          handler: () => {
            doLog(currentSeason, maxEpInSeason)
          },
        },
        {
          text: 'View Show Details',
          icon: informationCircleOutline,
          handler: () => {
            navigate(`/tmdb/${show.tmdb_id}`)
          },
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    })
  }

  const nextEp = getNextEp()
  return {
    present,
    nextEp,
    logNext: nextEp ? () => doLog(nextEp.season, nextEp.episode) : null,
  }
}
