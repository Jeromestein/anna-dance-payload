import { getPayload } from 'payload'

import config from '@/payload.config'

export type GalleryPlacementKey =
  'homepageAfterFaculty' | 'facultyAfterTeam' | 'classesAfterOverview' | 'aboutAfterStory'

export async function getGalleryForPlacement(placement: GalleryPlacementKey) {
  const payload = await getPayload({ config })

  const placements = await payload.findGlobal({
    slug: 'gallery-placements',
    depth: 2,
    draft: false,
    overrideAccess: false,
  })

  const gallery = placements[placement]

  if (
    typeof gallery !== 'object' ||
    gallery === null ||
    gallery._status !== 'published' ||
    !gallery.showOnWebsite
  ) {
    return null
  }

  return gallery
}
