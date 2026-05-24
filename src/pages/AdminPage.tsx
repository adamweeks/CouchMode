import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBackButton,
  IonButtons,
  IonSpinner,
} from '@ionic/react'
import { useAdminOverview, useAdminUserList, useAdminPopularShows } from '../hooks/useAdminStats'
import type { AdminUser, PopularShow } from '../hooks/useAdminStats'

function StatCard({ value, label, sub }: { value: string | number; label: string; sub?: string }) {
  return (
    <div
      style={{
        background: 'var(--ion-item-background)',
        borderRadius: '14px',
        padding: '14px',
        textAlign: 'center',
        boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
      }}
    >
      <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--ion-color-primary)', margin: 0 }}>
        {value}
      </p>
      <p style={{ fontSize: '12px', color: 'var(--ion-color-medium)', margin: '2px 0 0' }}>{label}</p>
      {sub && (
        <p style={{ fontSize: '11px', color: 'var(--ion-color-success)', margin: '2px 0 0' }}>{sub}</p>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        padding: '20px 16px 8px',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: 'var(--ion-color-medium)',
        margin: 0,
      }}
    >
      {children}
    </p>
  )
}

function UsersTable({ users }: { users: AdminUser[] }) {
  return (
    <div style={{ overflowX: 'auto', padding: '0 16px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ color: 'var(--ion-color-medium)' }}>
            <th style={{ textAlign: 'left', padding: '6px 4px 10px', fontWeight: 600 }}>User</th>
            <th style={{ textAlign: 'right', padding: '6px 4px 10px', fontWeight: 600 }}>Shows</th>
            <th style={{ textAlign: 'right', padding: '6px 4px 10px', fontWeight: 600 }}>Eps</th>
            <th style={{ textAlign: 'right', padding: '6px 4px 10px', fontWeight: 600 }}>Rewatches</th>
            <th style={{ textAlign: 'right', padding: '6px 4px 10px', fontWeight: 600 }}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.user_id}
              style={{
                borderTop: '1px solid var(--ion-border-color)',
              }}
            >
              <td style={{ padding: '10px 4px' }}>
                {u.display_name !== u.email && (
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>{u.display_name}</p>
                )}
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--ion-color-medium)' }}>{u.email}</p>
              </td>
              <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 600 }}>{u.show_count}</td>
              <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 600 }}>
                {Number(u.episode_count).toLocaleString()}
              </td>
              <td style={{ padding: '10px 4px', textAlign: 'right', fontWeight: 600 }}>{u.rewatch_count}</td>
              <td
                style={{
                  padding: '10px 4px',
                  textAlign: 'right',
                  color: 'var(--ion-color-medium)',
                  whiteSpace: 'nowrap',
                  fontSize: '12px',
                }}
              >
                {new Date(u.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: '2-digit',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PopularShowsList({ shows }: { shows: PopularShow[] }) {
  return (
    <div style={{ padding: '0 16px 48px' }}>
      {shows.map((show, idx) => (
        <div
          key={show.tmdb_id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 0',
            borderTop: idx === 0 ? undefined : '1px solid var(--ion-border-color)',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--ion-color-medium)',
              minWidth: '22px',
              textAlign: 'center',
            }}
          >
            {idx + 1}
          </span>
          {show.poster_url ? (
            <img
              src={show.poster_url}
              alt={show.title}
              style={{ width: '36px', height: '52px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
              loading="lazy"
            />
          ) : (
            <div
              style={{
                width: '36px',
                height: '52px',
                borderRadius: '6px',
                background: 'var(--ion-color-light)',
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{show.title}</p>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--ion-color-medium)' }}>
              {show.user_count} {show.user_count === 1 ? 'user' : 'users'}
              {Number(show.total_rewatches) > 0 &&
                ` · ${show.total_rewatches} rewatch${show.total_rewatches !== 1 ? 'es' : ''}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function AdminPage() {
  const { data: overview, isLoading: loadingOverview, error: overviewError } = useAdminOverview()
  const { data: users = [], isLoading: loadingUsers } = useAdminUserList()
  const { data: popularShows = [], isLoading: loadingShows } = useAdminPopularShows()

  return (
    <IonPage>
      <IonHeader className="gradient-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/settings" />
          </IonButtons>
          <IonTitle>Admin Portal</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {overviewError ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ion-color-danger)' }}>
            <p>Failed to load admin stats. Make sure you have admin access.</p>
          </div>
        ) : (
          <>
            <SectionLabel>Overview</SectionLabel>
            {loadingOverview ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                <IonSpinner name="crescent" />
              </div>
            ) : overview ? (
              <div
                style={{
                  padding: '0 16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                }}
              >
                <StatCard
                  value={overview.total_users}
                  label="Total Users"
                  sub={`+${overview.new_users_30d} this month`}
                />
                <StatCard value={overview.users_with_shows} label="Users w/ Shows" />
                <StatCard value={overview.new_users_7d} label="New Users (7d)" />
                <StatCard
                  value={Number(overview.avg_shows_per_active_user).toFixed(1)}
                  label="Avg Shows / User"
                />
                <StatCard value={Number(overview.total_shows).toLocaleString()} label="Shows Tracked" />
                <StatCard
                  value={Number(overview.total_episodes_logged).toLocaleString()}
                  label="Episodes Logged"
                />
                <StatCard
                  value={Number(overview.completed_rewatches).toLocaleString()}
                  label="Completed Rewatches"
                />
                <StatCard
                  value={Number(overview.in_progress_rewatches).toLocaleString()}
                  label="In Progress"
                />
              </div>
            ) : null}

            <SectionLabel>Users ({loadingUsers ? '…' : users.length})</SectionLabel>
            {loadingUsers ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                <IonSpinner name="crescent" />
              </div>
            ) : (
              <UsersTable users={users} />
            )}

            <SectionLabel>Most Tracked Shows</SectionLabel>
            {loadingShows ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                <IonSpinner name="crescent" />
              </div>
            ) : (
              <PopularShowsList shows={popularShows} />
            )}
          </>
        )}
      </IonContent>
    </IonPage>
  )
}
