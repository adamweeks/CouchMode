import { IonSelect, IonSelectOption, IonInput } from '@ionic/react'

// Names match TMDB provider_name values for easy cross-reference
const STANDARD_SERVICES = [
  'Netflix',
  'Hulu',
  'Disney Plus',
  'Max',
  'Apple TV Plus',
  'Peacock Premium',
  'Paramount Plus',
  'Amazon Prime Video',
  'Tubi TV',
  'Crunchyroll',
]

const PHYSICAL_PURCHASED = [
  'Blu-ray / DVD',
  'iTunes / Apple TV',
  'Amazon (purchased)',
  'Vudu / Fandango At Home',
  'Google Play / YouTube',
]

function buildList(availableOn?: string[]): string[] {
  if (!availableOn || availableOn.length === 0) {
    return [...STANDARD_SERVICES, ...PHYSICAL_PURCHASED]
  }
  // Show TMDB providers first (exact names), then non-duplicated standard+physical options
  const rest = [...STANDARD_SERVICES, ...PHYSICAL_PURCHASED].filter(s => !availableOn.includes(s))
  return [...availableOn, ...rest]
}

interface Props {
  value: string
  onChange: (value: string) => void
  label?: string
  /** TMDB provider_name values for this show — shown at the top of the list */
  availableOn?: string[]
}

export function ServiceSelector({ value, onChange, label = 'Service (optional)', availableOn }: Props) {
  const list = buildList(availableOn)
  const isKnown = list.includes(value)
  const isOther = value !== '' && !isKnown
  const selectValue = isOther ? '__other__' : value

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <IonSelect
        value={selectValue}
        onIonChange={e => {
          const v = e.detail.value as string
          if (v === '__other__') {
            onChange('')
          } else {
            onChange(v ?? '')
          }
        }}
        label={label}
        labelPlacement="floating"
        fill="outline"
        placeholder="Select service…"
      >
        <IonSelectOption value="">None</IonSelectOption>
        {list.map(s => (
          <IonSelectOption key={s} value={s}>{s}</IonSelectOption>
        ))}
        <IonSelectOption value="__other__">Other…</IonSelectOption>
      </IonSelect>
      {(selectValue === '__other__' || isOther) && (
        <IonInput
          value={isOther ? value : ''}
          onIonInput={e => onChange(e.detail.value ?? '')}
          placeholder="Enter service name"
          label="Custom service"
          labelPlacement="floating"
          fill="outline"
          clearInput
        />
      )}
    </div>
  )
}
