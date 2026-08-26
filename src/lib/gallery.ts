import { getPayload } from 'payload'

import config from '@/payload.config'

export async function getHomepageGallery() {
  const payload = await getPayload({ config })

  return payload.findGlobal({
    slug: 'homepage-gallery',
    depth: 2,
    draft: false,
    overrideAccess: false,
  })
}
