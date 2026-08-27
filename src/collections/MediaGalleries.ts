import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const MediaGalleries: CollectionConfig = {
  slug: 'media-galleries',
  labels: {
    singular: 'Media Gallery',
    plural: 'Media Galleries',
  },
  admin: {
    defaultColumns: ['internalName', 'showOnWebsite', '_status', 'updatedAt'],
    description:
      'Create reusable groups of photos and videos, then assign each group to one or more website positions.',
    group: 'Website Content',
    useAsTitle: 'internalName',
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: ({ req }) => {
      if (req.user) return true

      return {
        _status: {
          equals: 'published',
        },
        showOnWebsite: {
          equals: true,
        },
      }
    },
    update: authenticated,
  },
  fields: [
    {
      name: 'internalName',
      type: 'text',
      label: 'Internal name',
      required: true,
      unique: true,
      admin: {
        description:
          'Used only in the CMS, for example “Home — Studio Moments” or “Classes — Highlights”.',
      },
    },
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
    {
      name: 'showOnWebsite',
      type: 'checkbox',
      label: 'Available on website',
      defaultValue: true,
      admin: {
        description: 'Turn this off to hide this gallery everywhere without deleting it.',
        position: 'sidebar',
      },
    },
  ],
  trash: true,
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
}
