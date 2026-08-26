import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const Images: CollectionConfig = {
  slug: 'images',
  labels: {
    singular: 'Image',
    plural: 'Images',
  },
  admin: {
    defaultColumns: ['filename', 'title', 'updatedAt'],
    description: 'Upload website photos once, then reuse them in Faculty and other sections.',
    group: 'Media Library',
    useAsTitle: 'title',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: () => true,
    update: authenticated,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Image name',
      required: true,
      admin: {
        description: 'A short internal name, such as “Anna studio portrait”.',
      },
    },
    {
      name: 'altText',
      type: 'text',
      label: 'Image description',
      required: true,
      admin: {
        description: 'Describe the image for visitors who use a screen reader.',
      },
    },
  ],
  trash: true,
  upload: {
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 320,
        height: 400,
        position: 'centre',
        withoutEnlargement: true,
      },
      {
        name: 'facultyCard',
        width: 900,
        height: 1125,
        position: 'centre',
        withoutEnlargement: true,
      },
    ],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    pasteURL: false,
  },
}
