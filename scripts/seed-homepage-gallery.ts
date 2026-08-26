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
        equals: 'Anna Dance media storage test',
      },
    },
  })
  const video = videos.docs[0]

  if (!video) {
    throw new Error('Missing generated video record: Anna Dance media storage test')
  }

  const gallery = await payload.updateGlobal({
    slug: 'homepage-gallery',
    data: {
      _status: 'published',
      eyebrow: 'Inside the studio',
      heading: 'Movement, moments, and community.',
      introduction:
        'A glimpse into classes, rehearsals, performances, and the everyday joy of learning together.',
      items: [
        {
          caption: 'Foundation, expression, and thoughtful training.',
          image: images[0].id,
          mediaType: 'image',
        },
        {
          caption: 'Performance projects shaped around each term.',
          image: images[1].id,
          mediaType: 'image',
        },
        {
          caption: 'Movement that makes space for personality.',
          image: images[2].id,
          mediaType: 'image',
        },
        {
          caption: 'Video playback test from the Supabase media library.',
          mediaType: 'video',
          video: video.id,
        },
      ],
    },
    depth: 0,
    draft: false,
    overrideAccess: true,
  })

  payload.logger.info(`Seeded ${gallery.items?.length || 0} published Homepage Gallery items`)
} finally {
  await payload.destroy()
}
