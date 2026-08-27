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

  const galleryDefinitions = [
    {
      eyebrow: 'Inside the studio',
      heading: 'Movement, moments, and community.',
      internalName: 'Home — Studio Moments',
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
      slug: 'home-studio',
    },
    {
      eyebrow: 'The Academy in motion',
      heading: 'Selected moments from class and performance.',
      internalName: 'About — Academy in Motion',
      introduction:
        'A separate gallery selected directly by the About page through its stable reference.',
      items: [
        {
          caption: 'Dunhuang-inspired dance on stage.',
          mediaType: 'video' as const,
          video: video.id,
        },
        {
          caption: 'Movement shaped by space and light.',
          image: images[2].id,
          mediaType: 'image' as const,
        },
        {
          caption: 'Performance, color, and character.',
          image: images[1].id,
          mediaType: 'image' as const,
        },
        {
          caption: 'Training grounded in expression.',
          image: images[0].id,
          mediaType: 'image' as const,
        },
      ],
      slug: 'about-academy',
    },
  ]

  for (const definition of galleryDefinitions) {
    const existing = await payload.find({
      collection: 'media-galleries',
      limit: 1,
      overrideAccess: true,
      where: {
        internalName: {
          equals: definition.internalName,
        },
      },
    })
    const data = {
      ...definition,
      _status: 'published' as const,
      showOnWebsite: true,
    }
    const gallery = existing.docs[0]
      ? await payload.update({
          collection: 'media-galleries',
          id: existing.docs[0].id,
          data,
          depth: 0,
          draft: false,
          overrideAccess: true,
        })
      : await payload.create({
          collection: 'media-galleries',
          data,
          depth: 0,
          draft: false,
          overrideAccess: true,
        })

    payload.logger.info(
      `Seeded ${gallery.items?.length || 0} items in ${gallery.internalName} (${gallery.slug})`,
    )
  }
} finally {
  await payload.destroy()
}
