import React from 'react'
import { vi } from 'vitest'

type AnyProps = Record<string, unknown>

const passChildren = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children)

export const IonPage = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { 'data-testid': 'ion-page' }, children)

export const IonContent = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', null, children)

export const IonHeader = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('header', null, children)

export const IonToolbar = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', null, children)

export const IonTitle = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('h1', null, children)

export const IonFooter = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('footer', null, children)

export const IonList = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('ul', null, children)

export const IonListHeader = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('li', null, children)

export const IonItem = ({
  children,
  onClick,
  button,
  'aria-label': ariaLabel,
}: {
  children?: React.ReactNode
  onClick?: () => void
  button?: boolean
  'aria-label'?: string
  [k: string]: unknown
}) =>
  React.createElement(
    'div',
    { role: button ? 'button' : undefined, onClick, 'aria-label': ariaLabel },
    children,
  )

export const IonLabel = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', null, children)

export const IonNote = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('span', null, children)

export const IonThumbnail = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', null, children)

export const IonItemSliding = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', null, children)

export const IonItemOptions = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', null, children)

export const IonItemOption = ({
  children,
  onClick,
}: {
  children?: React.ReactNode
  onClick?: () => void
  [k: string]: unknown
}) => React.createElement('button', { onClick }, children)

export const IonButton = ({
  children,
  onClick,
  disabled,
  'aria-label': ariaLabel,
}: {
  children?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  'aria-label'?: string
  [k: string]: unknown
}) => React.createElement('button', { onClick, disabled, 'aria-label': ariaLabel }, children)

export const IonButtons = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', null, children)

export const IonBackButton = ({ defaultHref }: { defaultHref?: string; [k: string]: unknown }) =>
  React.createElement('button', { 'aria-label': 'back' }, defaultHref ?? 'Back')

export const IonIcon = (_props: AnyProps) => null

export const IonReorder = (_props: AnyProps) => React.createElement('div', null)

export const IonReorderGroup = ({
  children,
}: {
  children?: React.ReactNode
  onIonItemReorder?: (e: unknown) => void
  disabled?: boolean
  [k: string]: unknown
}) => React.createElement('div', null, children)

export const IonSearchbar = ({
  value,
  onIonInput,
  placeholder,
}: {
  value?: string
  onIonInput?: (e: { detail: { value: string } }) => void
  onIonClear?: () => void
  placeholder?: string
  [k: string]: unknown
}) =>
  React.createElement('input', {
    'data-testid': 'ion-searchbar',
    value: value ?? '',
    placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      onIonInput?.({ detail: { value: e.target.value } }),
  })

export const IonSpinner = (_props: AnyProps) =>
  React.createElement('div', { 'data-testid': 'ion-spinner' })

export const IonModal = ({
  children,
  isOpen,
}: {
  children?: React.ReactNode
  isOpen?: boolean
  [k: string]: unknown
}) =>
  isOpen ? React.createElement('div', { role: 'dialog' }, children) : null

export const IonTabBar = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', { role: 'tablist' }, children)

export const IonTabButton = ({
  children,
  onClick,
  selected,
  tab,
}: {
  children?: React.ReactNode
  onClick?: () => void
  selected?: boolean
  tab?: string
}) =>
  React.createElement(
    'button',
    { role: 'tab', 'aria-selected': selected, onClick, 'data-tab': tab },
    children,
  )

export const IonFab = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', null, children)

export const IonFabButton = ({
  children,
  onClick,
  'aria-label': ariaLabel,
}: {
  children?: React.ReactNode
  onClick?: () => void
  'aria-label'?: string
}) => React.createElement('button', { onClick, 'aria-label': ariaLabel }, children)

export const IonChip = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('span', null, children)

export const IonBadge = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('span', null, children)

export const IonSkeletonText = (_props: AnyProps) => null
export const IonProgressBar = (_props: AnyProps) => null
export const IonToast = (_props: AnyProps) => null
export const IonAlert = (_props: AnyProps) => null
export const IonInfiniteScroll = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('div', null, children)

export const IonText = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('span', null, children)

export const IonInput = ({
  value,
  onIonInput,
  placeholder,
  type,
}: {
  value?: string
  onIonInput?: (e: { detail: { value: string } }) => void
  placeholder?: string
  type?: string
  [k: string]: unknown
}) =>
  React.createElement('input', {
    value: value ?? '',
    placeholder,
    type,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      onIonInput?.({ detail: { value: e.target.value } }),
  })

export const IonTextarea = ({
  value,
  onIonInput,
}: {
  value?: string
  onIonInput?: (e: { detail: { value: string } }) => void
  [k: string]: unknown
}) =>
  React.createElement('textarea', {
    value: value ?? '',
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      onIonInput?.({ detail: { value: e.target.value } }),
  })

export const IonSelect = ({
  children,
  value,
  onIonChange,
  'aria-label': ariaLabel,
}: {
  children?: React.ReactNode
  value?: string
  onIonChange?: (e: { detail: { value: string } }) => void
  'aria-label'?: string
  [k: string]: unknown
}) =>
  React.createElement(
    'select',
    {
      value,
      'aria-label': ariaLabel,
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
        onIonChange?.({ detail: { value: e.target.value } }),
    },
    children,
  )

export const IonSelectOption = ({
  children,
  value,
}: {
  children?: React.ReactNode
  value?: string
}) => React.createElement('option', { value }, children)

export const IonCard = ({
  children,
  onClick,
}: {
  children?: React.ReactNode
  onClick?: () => void
}) => React.createElement('div', { onClick }, children)

export const IonCardHeader = passChildren
export const IonCardContent = passChildren
export const IonCardTitle = ({ children }: { children?: React.ReactNode }) =>
  React.createElement('h2', null, children)

export const IonAvatar = passChildren
export const IonImg = ({ src, alt }: { src?: string; alt?: string }) =>
  React.createElement('img', { src, alt })

export const IonRouterLink = ({
  children,
  routerLink,
}: {
  children?: React.ReactNode
  routerLink?: string
}) => React.createElement('a', { href: routerLink }, children)

export const IonSegment = ({
  children,
}: {
  children?: React.ReactNode
  value?: string
  onIonChange?: (e: unknown) => void
  [k: string]: unknown
}) => React.createElement('div', null, children)

export const IonSegmentButton = ({
  children,
  value,
}: {
  children?: React.ReactNode
  value?: string
}) => React.createElement('button', { value }, children)

export const IonAccordionGroup = passChildren
export const IonAccordion = passChildren
export const IonToggle = ({
  checked,
  onIonChange,
  'aria-label': ariaLabel,
}: {
  checked?: boolean
  onIonChange?: (e: { detail: { checked: boolean } }) => void
  'aria-label'?: string
  [k: string]: unknown
}) =>
  React.createElement('input', {
    type: 'checkbox',
    checked,
    'aria-label': ariaLabel,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      onIonChange?.({ detail: { checked: e.target.checked } }),
  })

export const IonRange = (_props: AnyProps) => null
export const IonRefresher = passChildren
export const IonRefresherContent = (_props: AnyProps) => null
export const IonMenu = passChildren
export const IonMenuButton = (_props: AnyProps) => React.createElement('button', null)
export const IonSplitPane = passChildren
export const IonNav = passChildren
export const IonPopover = ({
  children,
  isOpen,
}: {
  children?: React.ReactNode
  isOpen?: boolean
}) => (isOpen ? React.createElement('div', null, children) : null)
export const IonActionSheet = (_props: AnyProps) => null
export const IonLoading = (_props: AnyProps) => null
export const IonDatetime = (_props: AnyProps) => null
export const IonDatetimeButton = (_props: AnyProps) => null

// Hooks
export const useIonActionSheet = () => [vi.fn()] as const
export const useIonAlert = () => [vi.fn()] as const
export const useIonToast = () => [vi.fn()] as const
export const useIonLoading = () => [vi.fn(), vi.fn()] as const
export const useIonModal = () => [vi.fn(), vi.fn()] as const
export const useIonPopover = () => [vi.fn(), vi.fn()] as const
export const useIonRouter = () => ({ push: vi.fn(), goBack: vi.fn(), canGoBack: vi.fn(() => false) })

export const setupIonicReact = vi.fn()
export const isPlatform = vi.fn(() => false)
export const getPlatforms = vi.fn(() => [])
