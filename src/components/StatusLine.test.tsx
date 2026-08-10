import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusLine } from './StatusLine'

describe('StatusLine', () => {
  it('shows the label and detail joined by a middot', () => {
    render(<StatusLine icon="i" label="Watched" detail="S1 E3" />)
    expect(screen.getByText('Watched')).toBeInTheDocument()
    expect(screen.getByText('· S1 E3')).toBeInTheDocument()
  })

  it('renders the label alone when there is no detail', () => {
    render(<StatusLine icon="i" label="Not started" />)
    expect(screen.getByText('Not started')).toBeInTheDocument()
    // No detail means no middot separator anywhere.
    expect(screen.queryByText(/·/)).not.toBeInTheDocument()
  })

  it('drops the label word when hideLabel is set and a detail can stand in for it', () => {
    render(<StatusLine icon="i" label="Watched" detail="S1 E3" hideLabel />)
    expect(screen.queryByText('Watched')).not.toBeInTheDocument()
    // The detail shows on its own, with no orphaned leading middot.
    expect(screen.getByText('S1 E3')).toBeInTheDocument()
    expect(screen.queryByText('· S1 E3')).not.toBeInTheDocument()
  })

  it('keeps the label when hideLabel is set but there is no detail (never a bare icon)', () => {
    render(<StatusLine icon="i" label="Completed" hideLabel />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })
})
