import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ClassesPage from '@/app/(frontend)/classes/page'
import { classes } from '@/lib/site-data'
import { getStudentAccountAccess } from '@/lib/auth/student-access'

vi.mock('@/lib/auth/student-access', () => ({ getStudentAccountAccess: vi.fn() }))
vi.mock('@/lib/staff/auth', () => ({ getPayloadStaffUser: vi.fn().mockResolvedValue(null) }))
vi.mock('@/lib/classes', async () => {
  const { classes } = await import('@/lib/site-data')
  return {
    getPublicClasses: vi
      .fn()
      .mockResolvedValue(classes.map((item) => ({ ...item, id: item.title }))),
  }
})

afterEach(cleanup)

describe('Classes page course options', () => {
  it('renders only Free Placement links for signed-out visitors', async () => {
    vi.mocked(getStudentAccountAccess).mockResolvedValue(false)
    render(await ClassesPage())

    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('group')).toHaveLength(0)
    for (const item of classes) {
      expect(
        screen
          .getByRole('link', { name: `Book a Free Placement for ${item.title}` })
          .getAttribute('href'),
      ).toBe('/schedule')
    }
    expect(screen.queryByText('level-1')).toBeNull()
    expect(screen.queryByText('Saturday · 13:00–14:00')).toBeNull()
  })

  it('shows the CSV levels and all six competition slots only after authentication', async () => {
    vi.mocked(getStudentAccountAccess).mockResolvedValue(true)
    render(await ClassesPage())

    const group = within(
      screen.getByRole('group', { name: 'Level-Based Group Classes class options' }),
    )
    expect(group.getAllByRole('link').map((button) => button.textContent)).toEqual([
      'level-1 Saturday · 13:00–14:00',
      'level-2 Saturday · 16:00–17:00',
      'level-3 Monday · 17:00–18:00',
    ])
    const competition = within(
      screen.getByRole('group', { name: 'Competition Solo & Duet class options' }),
    )
    for (const name of [
      'Duet Class Monday · 16:00–17:00',
      'Duet Class Friday · 17:30–18:30',
      'Duet Class Friday · 18:30–19:30',
      'Duet Class Saturday · 14:00–15:00',
      'Solo Class · 30 min Friday · 16:30–17:00',
      'Solo Class · 60 min Monday · 18:00–19:00',
    ])
      expect(competition.getByRole('link', { name })).toBeDefined()
    expect(competition.getAllByRole('link')).toHaveLength(6)

    const options = [...group.getAllByRole('link'), ...competition.getAllByRole('link')]
    expect(options.map((link) => link.getAttribute('href'))).toEqual([
      '/classes/level-1',
      '/classes/level-2',
      '/classes/level-3',
      '/classes/DUET-01',
      '/classes/DUET-02',
      '/classes/DUET-03',
      '/classes/DUET-04',
      '/classes/SOLO-01',
      '/classes/SOLO-02',
    ])
    expect(
      screen.queryByRole('link', { name: 'Book a Free Placement for Level-Based Group Classes' }),
    ).toBeNull()
    expect(
      screen
        .getByRole('link', { name: 'Book a Free Placement for Seasonal Summer Camps' })
        .getAttribute('href'),
    ).toBe('/schedule')
  })
})
