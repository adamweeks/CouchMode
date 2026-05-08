import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { AppTabBar } from './AppTabBar'

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

function renderTabBar(path: string) {
  const mockNavigate = vi.fn()
  vi.mocked(useNavigate).mockReturnValue(mockNavigate)

  render(
    <MemoryRouter initialEntries={[path]}>
      <AppTabBar />
    </MemoryRouter>,
  )
  return { mockNavigate }
}

describe('AppTabBar', () => {
  it('marks My Shows as selected when on /', () => {
    renderTabBar('/')
    const myShowsBtn = screen.getByText('My Shows').closest('button')
    expect(myShowsBtn).toHaveAttribute('aria-selected', 'true')
  })

  it('marks History as not selected when on /', () => {
    renderTabBar('/')
    const historyBtn = screen.getByText('History').closest('button')
    expect(historyBtn).toHaveAttribute('aria-selected', 'false')
  })

  it('marks History as selected when on /history', () => {
    renderTabBar('/history')
    const historyBtn = screen.getByText('History').closest('button')
    expect(historyBtn).toHaveAttribute('aria-selected', 'true')
  })

  it('marks Settings as selected when on /settings', () => {
    renderTabBar('/settings')
    const settingsBtn = screen.getByText('Settings').closest('button')
    expect(settingsBtn).toHaveAttribute('aria-selected', 'true')
  })

  it('navigates to / when My Shows tab is clicked', () => {
    const { mockNavigate } = renderTabBar('/history')
    fireEvent.click(screen.getByText('My Shows'))
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('navigates to /history when History tab is clicked', () => {
    const { mockNavigate } = renderTabBar('/')
    fireEvent.click(screen.getByText('History'))
    expect(mockNavigate).toHaveBeenCalledWith('/history')
  })

  it('navigates to /settings when Settings tab is clicked', () => {
    const { mockNavigate } = renderTabBar('/')
    fireEvent.click(screen.getByText('Settings'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings')
  })
})
