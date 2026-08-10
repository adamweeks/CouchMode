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
  color = 'var(--ion-color-medium)',
  style,
}: {
  icon: string
  label: string
  detail?: string
  color?: string
  style?: CSSProperties
}) {
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
      <span style={{ fontWeight: 600, flexShrink: 0 }}>{label}</span>
      {detail && (
        <span
          style={{
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          · {detail}
        </span>
      )}
    </p>
  )
}
