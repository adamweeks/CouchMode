import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders "Not Started" for not_started status', () => {
    render(<StatusBadge status="not_started" />)
    expect(screen.getByText('Not Started')).toBeInTheDocument()
  })

  it('renders "In Progress" for in_progress status', () => {
    render(<StatusBadge status="in_progress" />)
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('renders "Completed" for completed status', () => {
    render(<StatusBadge status="completed" />)
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('applies gray styling for not_started', () => {
    const { container } = render(<StatusBadge status="not_started" />)
    expect(container.firstChild).toHaveClass('bg-gray-700')
  })

  it('applies blue styling for in_progress', () => {
    const { container } = render(<StatusBadge status="in_progress" />)
    expect(container.firstChild).toHaveClass('bg-blue-900')
  })

  it('applies green styling for completed', () => {
    const { container } = render(<StatusBadge status="completed" />)
    expect(container.firstChild).toHaveClass('bg-green-900')
  })
})
