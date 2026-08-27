import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SocialFollow } from '@/components/SocialFollow'
import type { SocialProfile } from '@/payload-types'

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
    expect(screen.queryByLabelText('Open our WeChat details')).toBeNull()
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
})
