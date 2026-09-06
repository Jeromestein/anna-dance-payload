import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SocialFollow } from '@/components/SocialFollow'
import type { Image, SocialProfile } from '@/payload-types'

const baseProfiles: SocialProfile = {
  id: 1,
  heading: 'Follow our journey.',
  message: 'See classes, rehearsal moments, and performances beyond the studio.',
  showInFooter: true,
  _status: 'published',
}

afterEach(cleanup)

describe('SocialFollow', () => {
  it('renders only platforms with configured details', () => {
    render(
      React.createElement(SocialFollow, {
        profiles: {
          ...baseProfiles,
          facebookUrl: 'https://www.facebook.com/',
          instagramUrl: '',
          wechatId: null,
          wechatQrCode: null,
        },
        variant: 'gallery',
      }),
    )

    expect(screen.getByLabelText('Visit our Facebook page')).toBeDefined()
    expect(screen.queryByLabelText('Visit our Instagram profile')).toBeNull()
    expect(screen.queryByLabelText('Open our WeChat QR code')).toBeNull()
  })

  it('hides the complete component when every platform is empty', () => {
    const { container } = render(
      React.createElement(SocialFollow, {
        profiles: {
          ...baseProfiles,
          facebookUrl: '',
          instagramUrl: null,
          wechatId: '',
          wechatQrCode: null,
        },
        variant: 'footer',
      }),
    )

    expect(container.innerHTML).toBe('')
  })

  it('opens the configured WeChat QR code and ID in a dialog', () => {
    const qrCode: Image = {
      id: 7,
      altText: 'WeChat QR code for wudaolaoshi0717',
      createdAt: '2026-09-06T00:00:00.000Z',
      title: 'Anna Dance Academy WeChat QR code',
      updatedAt: '2026-09-06T00:00:00.000Z',
      url: '/images/social/wechat-wudaolaoshi0717.png',
    }

    render(
      React.createElement(SocialFollow, {
        profiles: {
          ...baseProfiles,
          wechatId: 'wudaolaoshi0717',
          wechatQrCode: qrCode,
        },
        variant: 'gallery',
      }),
    )

    fireEvent.click(screen.getByLabelText('Open our WeChat QR code'))

    expect(screen.getByRole('dialog', { name: 'Connect on WeChat' })).toBeDefined()
    expect(screen.getByAltText('WeChat QR code for wudaolaoshi0717').getAttribute('src')).toBe(
      '/images/social/wechat-wudaolaoshi0717.png',
    )
    expect(screen.getByText('wudaolaoshi0717')).toBeDefined()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Connect on WeChat' })).toBeNull()
  })
})
