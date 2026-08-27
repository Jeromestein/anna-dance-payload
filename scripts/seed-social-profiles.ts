import { getPayload } from 'payload'

import config from '../src/payload.config'

const payload = await getPayload({ config })

try {
  const profiles = await payload.updateGlobal({
    slug: 'social-profiles',
    data: {
      _status: 'published',
      facebookUrl: 'https://www.facebook.com/',
      heading: 'Follow our journey.',
      instagramUrl: 'https://www.instagram.com/',
      message: 'See classes, rehearsal moments, and performances beyond the studio.',
      showInFooter: true,
      wechatId: 'AnnaDanceAcademyPOC',
    },
    depth: 0,
    draft: false,
    overrideAccess: true,
  })

  payload.logger.info(
    `Seeded ${profiles.heading} with Facebook, Instagram, and a placeholder WeChat ID`,
  )
} finally {
  await payload.destroy()
}
