import { IonIcon } from '@ionic/react'
import type { CSSProperties } from 'react'

/**
 * A single status line: an always-visible status icon, a short label word,
 * and an optional detail (e.g. the episode) that truncates when space runs out.
 * The icon carries the meaning on its own; the label text is shown alongside it
 * to teach that meaning whenever there's room.
 */
export function StatusLine({
  icon,
  label,
  detail,
  hideLabel = false,
  color = 'var(--ion-color-medium)',
  style,
}: {
  icon: string
  label: string
  detail?: string
  /**
   * When true, drop the visible label word to avoid repeating a status that's
   * already stated nearby (e.g. a section header). The word is only hidden when
   * there's a detail to stand in for it, so the line is never a bare icon. The
   * icon keeps its aria-label either way.
   */
  hideLabel?: boolean
  color?: string
  style?: CSSProperties
}) {
  const showLabel = !hideLabel || !detail

  return (
    <p
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        margin: 0,
        minWidth: 0,
        fontSize: '12px',
        color,
        ...style,
      }}
    >
      <IonIcon
        icon={icon}
        aria-label={label}
        style={{ fontSize: '13px', flexShrink: 0 }}
      />
      {showLabel && <span style={{ fontWeight: 600, flexShrink: 0 }}>{label}</span>}
      {detail && (
        <span
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {showLabel ? `· ${detail}` : detail}
        </span>
      )}
    </p>
  )
}
