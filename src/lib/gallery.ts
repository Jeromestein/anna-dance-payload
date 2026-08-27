import { getPayload } from 'payload'

import config from '@/payload.config'

export async function getMediaGalleryBySlug(slug: string) {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'media-galleries',
    depth: 2,
    draft: false,
    limit: 1,
    overrideAccess: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs[0] || null
}
