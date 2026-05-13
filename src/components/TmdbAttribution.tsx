const TMDB_LOGO_URL =
  'https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg'

export function TmdbAttribution() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px 16px 4px',
        opacity: 0.6,
      }}
    >
      <img src={TMDB_LOGO_URL} alt="Powered by TMDB" style={{ height: '14px', width: 'auto' }} />
      <span style={{ fontSize: '11px', color: 'var(--ion-color-medium)' }}>Powered by TMDB</span>
    </div>
  )
}
