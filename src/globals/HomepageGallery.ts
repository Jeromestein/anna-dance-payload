import type { GlobalConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const HomepageGallery: GlobalConfig = {
  slug: 'homepage-gallery',
  label: 'Homepage Gallery',
  admin: {
    description:
      'Choose photos and videos for the homepage gallery, then drag the rows into the order you want.',
    group: 'Website Content',
  },
  access: {
    read: () => true,
    update: authenticated,
  },
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      label: 'Small heading',
      defaultValue: 'Inside the studio',
      required: true,
    },
    {
      name: 'heading',
      type: 'text',
      label: 'Heading',
      defaultValue: 'Movement, moments, and community.',
      required: true,
    },
    {
      name: 'introduction',
      type: 'textarea',
      label: 'Introduction',
      defaultValue:
        'A glimpse into classes, rehearsals, performances, and the everyday joy of learning together.',
      required: true,
      admin: {
        rows: 3,
      },
    },
    {
      name: 'items',
      type: 'array',
      label: 'Selected photos and videos',
      maxRows: 12,
      admin: {
        description:
          'Add up to 12 items. Choose the media type first, select a file, then drag rows to reorder the wall.',
        initCollapsed: true,
        isSortable: true,
      },
      fields: [
        {
          name: 'mediaType',
          type: 'radio',
          label: 'Media type',
          defaultValue: 'image',
          options: [
            {
              label: 'Image',
              value: 'image',
            },
            {
              label: 'Video',
              value: 'video',
            },
          ],
          required: true,
          admin: {
            layout: 'horizontal',
          },
        },
        {
          name: 'image',
          type: 'upload',
          label: 'Choose image',
          relationTo: 'images',
          required: true,
          admin: {
            condition: (_data, siblingData) => siblingData.mediaType === 'image',
            description: 'Choose an existing image or upload a new one.',
          },
        },
        {
          name: 'video',
          type: 'upload',
          label: 'Choose video',
          relationTo: 'videos',
          required: true,
          admin: {
            condition: (_data, siblingData) => siblingData.mediaType === 'video',
            description: 'Choose an existing video or upload a new one.',
          },
        },
        {
          name: 'caption',
          type: 'text',
          label: 'Caption (optional)',
          admin: {
            description: 'A short line shown over the bottom of this item.',
          },
        },
      ],
    },
  ],
  versions: {
    drafts: true,
    max: 20,
  },
}
