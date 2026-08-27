import { getPayload } from 'payload'

import config from '../src/payload.config'

const payload = await getPayload({ config })

try {
  const imageTitles = [
    'Anna Liu ballet portrait',
    'Alinuer Wumaer performance portrait',
    'Grace Leung dance portrait',
  ]
  const images = []

  for (const title of imageTitles) {
    const result = await payload.find({
      collection: 'images',
      limit: 1,
      overrideAccess: true,
      where: {
        title: {
          equals: title,
        },
      },
    })

    const image = result.docs[0]

    if (!image) {
      throw new Error(`Missing image record: ${title}`)
    }

    images.push(image)
  }

  const videos = await payload.find({
    collection: 'videos',
    limit: 1,
    overrideAccess: true,
    where: {
      title: {
        equals: 'Dunhuang Dance Stage Performance',
      },
    },
  })
  const video = videos.docs[0]

  if (!video) {
    throw new Error('Missing video record: Dunhuang Dance Stage Performance')
  }

  const internalName = 'Home — Studio Moments'
  const existing = await payload.find({
    collection: 'media-galleries',
    limit: 1,
    overrideAccess: true,
    where: {
      internalName: {
        equals: internalName,
      },
    },
  })
  const galleryData = {
    _status: 'published' as const,
    eyebrow: 'Inside the studio',
    heading: 'Movement, moments, and community.',
    internalName,
    introduction:
      'A glimpse into classes, rehearsals, performances, and the everyday joy of learning together.',
    items: [
      {
        caption: 'Foundation, expression, and thoughtful training.',
        image: images[0].id,
        mediaType: 'image' as const,
      },
      {
        caption: 'Performance projects shaped around each term.',
        image: images[1].id,
        mediaType: 'image' as const,
      },
      {
        caption: 'Movement that makes space for personality.',
        image: images[2].id,
        mediaType: 'image' as const,
      },
      {
        caption: 'Dunhuang-inspired dance on stage.',
        mediaType: 'video' as const,
        video: video.id,
      },
    ],
    showOnWebsite: true,
  }

  const gallery = existing.docs[0]
    ? await payload.update({
        collection: 'media-galleries',
        id: existing.docs[0].id,
        data: galleryData,
        depth: 0,
        draft: false,
        overrideAccess: true,
      })
    : await payload.create({
        collection: 'media-galleries',
        data: galleryData,
        depth: 0,
        draft: false,
        overrideAccess: true,
      })

  await payload.updateGlobal({
    slug: 'gallery-placements',
    data: {
      _status: 'published',
      homepageAfterFaculty: gallery.id,
    },
    depth: 0,
    draft: false,
    overrideAccess: true,
  })

  payload.logger.info(
    `Seeded ${gallery.items?.length || 0} items in ${gallery.internalName} and assigned the homepage placement`,
  )
} finally {
  await payload.destroy()
}
