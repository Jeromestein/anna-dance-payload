import type { Field, GlobalConfig } from 'payload'

import { authenticated } from '../access/authenticated'

function galleryPlacement(name: string, label: string, description: string): Field {
  return {
    name,
    type: 'relationship',
    label,
    relationTo: 'media-galleries',
    admin: {
      description,
    },
  }
}

export const GalleryPlacements: GlobalConfig = {
  slug: 'gallery-placements',
  label: 'Gallery Placements',
  admin: {
    description:
      'Choose which reusable Media Gallery appears in each fixed website position. The same gallery can be selected more than once.',
    group: 'Website Content',
  },
  access: {
    read: () => true,
    update: authenticated,
  },
  fields: [
    galleryPlacement(
      'homepageAfterFaculty',
      'Homepage — after Faculty',
      'Shown directly below the teaching team on the homepage.',
    ),
    galleryPlacement(
      'facultyAfterTeam',
      'Faculty page — after teaching team',
      'Reserved for the full Faculty page.',
    ),
    galleryPlacement(
      'classesAfterOverview',
      'Classes page — after overview',
      'Reserved for class photos and videos below the Classes overview.',
    ),
    galleryPlacement(
      'aboutAfterStory',
      'About page — after Academy story',
      'Reserved for history, performance, or studio media on the About page.',
    ),
  ],
  versions: {
    drafts: true,
    max: 20,
  },
}
