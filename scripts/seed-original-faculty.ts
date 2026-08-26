import path from 'node:path'

import { getPayload } from 'payload'

import config from '../src/payload.config'

const sourceRepository = process.argv[2]

if (!sourceRepository) {
  throw new Error(
    'Pass the Anna Dance Academy repository path as the first argument to this script.',
  )
}

const facultyMembers = [
  {
    description:
      'With more than 15 years in dance education, choreography, performance, and artistic direction, Anna builds training around each dancer’s foundation, personality, and goals.',
    introduction: 'Chinese Dance · Choreography · Competition Coaching',
    name: 'Anna Liu',
    photo: 'public/images/anna-liu/anna-liu-ballet-closeup.jpg',
    photoAlt: 'Anna Liu performing ballet in a pale pink tutu',
    photoTitle: 'Anna Liu ballet portrait',
    title: 'Founder & Artistic Director',
  },
  {
    description:
      'Alinuer joins selected classes, rehearsals, and performance projects as the Academy’s schedule and student needs evolve each term.',
    introduction: 'Selected Classes · Rehearsals · Performance Projects',
    name: 'Alinuer Wumaer',
    photo: 'public/images/faculty/alinuer-wumaer.jpg',
    photoAlt: 'Alinuer Wumaer performing in a blue and yellow costume',
    photoTitle: 'Alinuer Wumaer performance portrait',
    title: 'Teaching Artist',
  },
  {
    description:
      'Grace supports selected classes, rehearsals, and performance projects, with teaching assignments shaped around each term’s program needs.',
    introduction: 'Selected Classes · Rehearsals · Performance Projects',
    name: 'Grace Leung',
    photo: 'public/images/faculty/grace-leung.jpg',
    photoAlt: 'Grace Leung performing in a blue dress beside her shadow',
    photoTitle: 'Grace Leung dance portrait',
    title: 'Teaching Artist',
  },
] as const

const payload = await getPayload({ config })

try {
  const sampleProfile = await payload.find({
    collection: 'faculty',
    limit: 1,
    overrideAccess: true,
    where: {
      name: {
        equals: 'Sample Faculty Member',
      },
    },
  })

  for (const [index, member] of facultyMembers.entries()) {
    const existingImages = await payload.find({
      collection: 'images',
      limit: 1,
      overrideAccess: true,
      where: {
        title: {
          equals: member.photoTitle,
        },
      },
    })

    const image =
      existingImages.docs[0] ??
      (await payload.create({
        collection: 'images',
        data: {
          altText: member.photoAlt,
          title: member.photoTitle,
        },
        filePath: path.join(sourceRepository, member.photo),
        overrideAccess: true,
      }))

    const existingProfiles = await payload.find({
      collection: 'faculty',
      limit: 1,
      overrideAccess: true,
      where: {
        name: {
          equals: member.name,
        },
      },
    })

    const existingProfile =
      existingProfiles.docs[0] ?? (index === 0 ? sampleProfile.docs[0] : undefined)
    const data = {
      _status: 'published' as const,
      description: member.description,
      introduction: member.introduction,
      name: member.name,
      profilePhoto: image.id,
      showOnWebsite: true,
      title: member.title,
    }

    const profile = existingProfile
      ? await payload.update({
          id: existingProfile.id,
          collection: 'faculty',
          data,
          draft: false,
          overrideAccess: true,
        })
      : await payload.create({
          collection: 'faculty',
          data,
          draft: false,
          overrideAccess: true,
        })

    payload.logger.info(`Seeded ${profile.name}`)
  }

  const seededProfiles = await payload.find({
    collection: 'faculty',
    depth: 0,
    limit: 20,
    overrideAccess: true,
    sort: '_order',
  })

  for (const profile of seededProfiles.docs) {
    payload.logger.info(
      `${profile.name}: status=${profile._status}, visible=${profile.showOnWebsite}`,
    )
  }
} finally {
  await payload.destroy()
}
